-- ============================================================
-- DOMUS+ | Migración: ficha de emergencia (integrantes) + contactos de
-- emergencia + profesionales de salud (vet/pediatra) para integrantes y
-- mascotas.
--
-- profesional_salud sigue la misma convención "un solo padre" que ya usan
-- historial/adjunto (chk_historial_perfil en 01_schema.sql,
-- chk_adjunto_un_padre en 04_adjuntos.sql), acá con 2 padres posibles
-- (integrante, mascota) en vez de 5.
--
-- contacto_emergencia NO es polimórfica — un contacto de emergencia sólo
-- tiene sentido para un integrante (uno-a-muchos real, integrante_id NOT
-- NULL directo, sin CHECK de "un solo padre" porque sólo hay un padre
-- posible).
--
-- SET NAMES obligatorio ANTES de cualquier DDL en este proyecto — mismo
-- criterio ya aplicado en 03_grupo_compartido.sql y 04_adjuntos.sql:
-- docker-entrypoint-initdb.d no asume utf8mb4 por su cuenta, y esta
-- migración tampoco tiene literales no-ASCII hoy (los ENUM/nombres de
-- columna son ASCII puro), pero blindar contra el charset del cliente que
-- la ejecute es el hábito que evita repetir el mojibake de 'dueño' de la
-- vez pasada, tenga o no texto no-ASCII la migración de turno.
-- ============================================================

USE domus_db;

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 1. Campos de emergencia directos en integrante (nullable, sin tabla 1:1
--    aparte — no hay un ciclo de vida independiente que lo justifique).
-- ------------------------------------------------------------
ALTER TABLE integrante
    ADD COLUMN alergias TEXT NULL,
    ADD COLUMN tipo_sangre VARCHAR(10) NULL,
    ADD COLUMN notas_emergencia TEXT NULL;

-- ------------------------------------------------------------
-- 2. CONTACTO_EMERGENCIA — uno-a-muchos por integrante.
-- ------------------------------------------------------------
CREATE TABLE contacto_emergencia (
    id              INT             NOT NULL AUTO_INCREMENT,
    integrante_id   INT             NOT NULL,
    nombre          VARCHAR(150)    NOT NULL,
    telefono        VARCHAR(30)     NOT NULL,
    relacion        VARCHAR(100)    NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_contacto_integrante
        FOREIGN KEY (integrante_id) REFERENCES integrante(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 3. PROFESIONAL_SALUD — polimórfica (integrante O mascota), "un solo padre".
-- ------------------------------------------------------------
CREATE TABLE profesional_salud (
    id              INT             NOT NULL AUTO_INCREMENT,
    integrante_id   INT             NULL,
    mascota_id      INT             NULL,
    nombre          VARCHAR(150)    NOT NULL,
    especialidad    VARCHAR(100)    NULL,
    telefono        VARCHAR(30)     NULL,
    direccion       VARCHAR(255)    NULL,
    notas           TEXT            NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_profesional_integrante
        FOREIGN KEY (integrante_id) REFERENCES integrante(id) ON DELETE CASCADE,
    CONSTRAINT fk_profesional_mascota
        FOREIGN KEY (mascota_id) REFERENCES mascota(id) ON DELETE CASCADE,
    CONSTRAINT chk_profesional_un_padre CHECK (
        (integrante_id IS NOT NULL) + (mascota_id IS NOT NULL) = 1
    )
);
