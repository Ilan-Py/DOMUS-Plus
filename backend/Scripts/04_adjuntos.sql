-- ============================================================
-- DOMUS+ | Migración: adjuntos (fotos/PDF en registros de salud y perfiles)
-- Sigue la misma convención "un solo padre" que ya usa historial
-- (chk_historial_perfil en 01_schema.sql), extendida de 2 a 5 padres
-- posibles: vacuna, tratamiento, historial, integrante o mascota.
--
-- SET NAMES obligatorio antes de cualquier DDL en este proyecto — no porque
-- esta migración tenga literales no-ASCII en el DDL (no los tiene: los
-- valores del ENUM 'imagen'/'pdf' son ASCII puro), sino porque
-- docker-entrypoint-initdb.d ya demostró en 03_grupo_compartido.sql que NO
-- asume utf8mb4 por su cuenta, y confiar en el default del cliente que
-- ejecute este archivo (mysql CLI, otra herramienta, otro SO) es
-- exactamente el error que mojibake-ó 'dueño' la vez pasada. Blindar todas
-- las migraciones futuras contra esto, tengan o no texto no-ASCII hoy.
-- ============================================================

USE domus_db;

SET NAMES utf8mb4;

CREATE TABLE adjunto (
    id              INT             NOT NULL AUTO_INCREMENT,
    vacuna_id       INT             NULL,
    tratamiento_id  INT             NULL,
    historial_id    INT             NULL,
    integrante_id   INT             NULL,
    mascota_id      INT             NULL,
    tipo_archivo    ENUM('imagen', 'pdf') NOT NULL,
    url             VARCHAR(500)    NOT NULL,
    public_id       VARCHAR(255)    NOT NULL,   -- id propio de Cloudinary, necesario para borrar el archivo remoto después
    nombre_original VARCHAR(255)    NULL,
    subido_por      INT             NOT NULL,   -- usuario_id de quien lo subió (atribución, mismo patrón que recordatorio.creado_por)
    subido_en       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_adjunto_vacuna FOREIGN KEY (vacuna_id) REFERENCES vacuna(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjunto_tratamiento FOREIGN KEY (tratamiento_id) REFERENCES tratamiento(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjunto_historial FOREIGN KEY (historial_id) REFERENCES historial(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjunto_integrante FOREIGN KEY (integrante_id) REFERENCES integrante(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjunto_mascota FOREIGN KEY (mascota_id) REFERENCES mascota(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjunto_usuario FOREIGN KEY (subido_por) REFERENCES usuario(id),
    CONSTRAINT chk_adjunto_un_padre CHECK (
        (vacuna_id IS NOT NULL) + (tratamiento_id IS NOT NULL) + (historial_id IS NOT NULL)
        + (integrante_id IS NOT NULL) + (mascota_id IS NOT NULL) = 1
    )
);
