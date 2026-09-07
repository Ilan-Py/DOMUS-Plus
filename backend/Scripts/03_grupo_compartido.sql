-- ============================================================
-- DOMUS+ | Migración: grupos familiares compartidos
-- Reemplaza el 1:1 grupo_familiar<->usuario por una tabla de membresía
-- (grupo_miembro): un grupo puede tener varios usuarios, pero cada usuario
-- sigue perteneciendo a lo sumo a un grupo activo a la vez (uq_miembro_usuario).
-- También agrega el código de invitación y hace que recordatorio pase de
-- ser por-usuario a ser compartido por grupo.
--
-- Pensado para correr UNA VEZ contra una base ya poblada por 01_schema.sql
-- (con o sin 02_inserts.sql) — no usa DROP DATABASE como 01_schema.sql.
-- Cada paso de migración de datos verifica conteos con SIGNAL antes de
-- tocar/dropear una columna vieja: si algo no migró bien, el script aborta
-- ahí (mysql CLI se detiene en el primer error) y no se pierde la columna
-- original.
-- ============================================================

USE domus_db;

-- SET NAMES obligatorio ANTES de cualquier DDL con literales no-ASCII
-- ('dueño' del ENUM más abajo): sin esto, el charset del CLIENTE mysql que
-- ejecuta este archivo (que varía según el entorno — confirmado que
-- docker-entrypoint-initdb.d NO asume utf8mb4 por su cuenta) determina cómo
-- se interpretan los bytes UTF-8 del literal ANTES de mandarlos al server,
-- pudiendo mojibake-ar el valor y dejarlo grabado mal en la propia
-- definición del ENUM para siempre (reproducido y confirmado en un
-- contenedor de prueba: el ENUM quedó literalmente como 'dueÃ±o' sin esto).
SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 1. GRUPO_MIEMBRO
-- ------------------------------------------------------------
CREATE TABLE grupo_miembro (
    id          INT             NOT NULL AUTO_INCREMENT,
    grupo_id    INT             NOT NULL,
    usuario_id  INT             NOT NULL,
    rol         ENUM('dueño', 'miembro') NOT NULL DEFAULT 'miembro',
    joined_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_miembro_usuario (usuario_id),
    CONSTRAINT fk_miembro_grupo
        FOREIGN KEY (grupo_id) REFERENCES grupo_familiar(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_miembro_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 2. codigo_invitacion
-- Nullable hasta la primera generación (POST /grupo/invitacion), regenerable
-- (UPDATE simple sobreescribe y por uq_codigo_invitacion invalida cualquier
-- código viejo apenas se genera uno nuevo). Se genera en Node, no en SQL —
-- charset elegido ahí: mayúsculas + dígitos sin 0/O/1/I/L.
-- ------------------------------------------------------------
ALTER TABLE grupo_familiar
    ADD COLUMN codigo_invitacion VARCHAR(10) NULL,
    ADD UNIQUE KEY uq_codigo_invitacion (codigo_invitacion);

-- ------------------------------------------------------------
-- 3. Migrar grupo_familiar.usuario_id -> grupo_miembro (rol 'dueño'),
--    verificar conteos, y sólo entonces dropear la columna 1:1 vieja.
-- ------------------------------------------------------------
DELIMITER $$

CREATE PROCEDURE migrar_grupo_miembro()
BEGIN
    DECLARE total_grupos INT;
    DECLARE total_duenos INT;

    INSERT INTO grupo_miembro (grupo_id, usuario_id, rol)
    SELECT id, usuario_id, 'dueño' FROM grupo_familiar;

    SELECT COUNT(*) INTO total_grupos FROM grupo_familiar;
    SELECT COUNT(*) INTO total_duenos FROM grupo_miembro WHERE rol = 'dueño';

    IF total_grupos <> total_duenos THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migración abortada: total_grupos != total_duenos en grupo_miembro. grupo_familiar.usuario_id NO se dropeó.';
    END IF;

    ALTER TABLE grupo_familiar
        DROP FOREIGN KEY fk_grupo_usuario,
        DROP INDEX uq_grupo_usuario,
        DROP COLUMN usuario_id;
END$$

DELIMITER ;

CALL migrar_grupo_miembro();
DROP PROCEDURE migrar_grupo_miembro;

-- ------------------------------------------------------------
-- 4. RECORDATORIO pasa de por-usuario a compartido por grupo.
--    usuario_id se conserva (renombrado a creado_por) como atribución de
--    quién lo creó — ya no es el límite de pertenencia, que ahora es
--    grupo_id. La FK fk_recordatorio_usuario sigue intacta sobre la columna
--    renombrada (CHANGE COLUMN no la rompe).
-- ------------------------------------------------------------
ALTER TABLE recordatorio
    ADD COLUMN grupo_id INT NULL;

DELIMITER $$

CREATE PROCEDURE migrar_recordatorio_grupo()
BEGIN
    DECLARE total_recordatorios INT;
    DECLARE total_migrados INT;

    UPDATE recordatorio r
    JOIN grupo_miembro gm ON gm.usuario_id = r.usuario_id
    SET r.grupo_id = gm.grupo_id;

    SELECT COUNT(*) INTO total_recordatorios FROM recordatorio;
    SELECT COUNT(*) INTO total_migrados FROM recordatorio WHERE grupo_id IS NOT NULL;

    IF total_recordatorios <> total_migrados THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migración abortada: quedaron recordatorios sin grupo_id (creador ya no tiene fila en grupo_miembro). recordatorio.grupo_id NO se hizo NOT NULL.';
    END IF;

    ALTER TABLE recordatorio
        MODIFY COLUMN grupo_id INT NOT NULL,
        ADD CONSTRAINT fk_recordatorio_grupo
            FOREIGN KEY (grupo_id) REFERENCES grupo_familiar(id)
            ON DELETE CASCADE;

    ALTER TABLE recordatorio
        CHANGE COLUMN usuario_id creado_por INT NOT NULL;
END$$

DELIMITER ;

CALL migrar_recordatorio_grupo();
DROP PROCEDURE migrar_recordatorio_grupo;
