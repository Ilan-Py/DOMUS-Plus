-- ============================================================
-- DOMUS+ | Script de creación de esquema
-- Codigo por ILAN PITASHNY
-- Orden: respetar secuencia por dependencias FK
-- Motor: MySQL / MariaDB
-- ============================================================

DROP DATABASE IF EXISTS domus_db;
CREATE DATABASE domus_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE domus_db;

-- ------------------------------------------------------------
-- 1. USUARIO
-- Actor principal del sistema. Crea y administra un grupo familiar.
-- ------------------------------------------------------------
CREATE TABLE usuario (
    id            INT             NOT NULL AUTO_INCREMENT,
    nombre        VARCHAR(100)    NOT NULL,
    apellido      VARCHAR(100)    NOT NULL,
    email         VARCHAR(150)    NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_usuario_email (email)
);

-- ------------------------------------------------------------
-- 2. GRUPO_FAMILIAR
-- Un usuario puede tener un único grupo familiar.
-- ------------------------------------------------------------
CREATE TABLE grupo_familiar (
    id          INT             NOT NULL AUTO_INCREMENT,
    usuario_id  INT             NOT NULL,
    nombre      VARCHAR(150)    NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_grupo_usuario (usuario_id),
    CONSTRAINT fk_grupo_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 3. INTEGRANTE
-- Persona del grupo familiar (hijo, adulto mayor, etc.).
-- tipo: enum que distingue el rol dentro del grupo.
-- ------------------------------------------------------------
CREATE TABLE integrante (
    id                  INT             NOT NULL AUTO_INCREMENT,
    grupo_id            INT             NOT NULL,
    nombre              VARCHAR(100)    NOT NULL,
    apellido            VARCHAR(100)    NOT NULL,
    fecha_nacimiento    DATE            NOT NULL,
    tipo                ENUM('adulto', 'menor', 'mayor') NOT NULL DEFAULT 'adulto',
    observaciones       TEXT            NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_integrante_grupo
        FOREIGN KEY (grupo_id) REFERENCES grupo_familiar(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 4. MASCOTA
-- Animal del grupo familiar.
-- raza es nullable (campo opcional según CU5).
-- ------------------------------------------------------------
CREATE TABLE mascota (
    id                  INT             NOT NULL AUTO_INCREMENT,
    grupo_id            INT             NOT NULL,
    nombre              VARCHAR(100)    NOT NULL,
    especie             VARCHAR(50)     NOT NULL,
    raza                VARCHAR(100)    NULL,
    fecha_nacimiento    DATE            NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_mascota_grupo
        FOREIGN KEY (grupo_id) REFERENCES grupo_familiar(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 5. VACUNA
-- Registro de vacunas para integrantes o mascotas.
-- Solo uno de (integrante_id, mascota_id) debe estar poblado.
-- proxima_dosis es nullable (campo opcional según CU7).
-- ------------------------------------------------------------
CREATE TABLE vacuna (
    id              INT             NOT NULL AUTO_INCREMENT,
    integrante_id   INT             NULL,
    mascota_id      INT             NULL,
    nombre          VARCHAR(150)    NOT NULL,
    fecha_aplicacion DATE           NOT NULL,
    proxima_dosis   DATE            NULL,
    notas           TEXT            NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_vacuna_integrante
        FOREIGN KEY (integrante_id) REFERENCES integrante(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_vacuna_mascota
        FOREIGN KEY (mascota_id) REFERENCES mascota(id)
        ON DELETE CASCADE,
    -- Solo uno de los dos FK puede estar poblado
    CONSTRAINT chk_vacuna_perfil
        CHECK (
            (integrante_id IS NOT NULL AND mascota_id IS NULL)
            OR
            (integrante_id IS NULL AND mascota_id IS NOT NULL)
        ),
    -- proxima_dosis debe ser posterior a fecha_aplicacion (CU7)
    CONSTRAINT chk_vacuna_fechas
        CHECK (proxima_dosis IS NULL OR proxima_dosis > fecha_aplicacion)
);

-- ------------------------------------------------------------
-- 6. TRATAMIENTO
-- Registro de tratamientos médicos para integrantes o mascotas.
-- Solo uno de (integrante_id, mascota_id) debe estar poblado.
-- ------------------------------------------------------------
CREATE TABLE tratamiento (
    id              INT             NOT NULL AUTO_INCREMENT,
    integrante_id   INT             NULL,
    mascota_id      INT             NULL,
    descripcion     VARCHAR(255)    NOT NULL,
    medicacion      VARCHAR(200)    NOT NULL,
    fecha_inicio    DATE            NOT NULL,
    fecha_fin       DATE            NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_tratamiento_integrante
        FOREIGN KEY (integrante_id) REFERENCES integrante(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tratamiento_mascota
        FOREIGN KEY (mascota_id) REFERENCES mascota(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_tratamiento_perfil
        CHECK (
            (integrante_id IS NOT NULL AND mascota_id IS NULL)
            OR
            (integrante_id IS NULL AND mascota_id IS NOT NULL)
        )
);

-- ------------------------------------------------------------
-- 7. HISTORIAL
-- Eventos médicos generales asociados a integrante o mascota.
-- Solo uno de (integrante_id, mascota_id) debe estar poblado.
-- ------------------------------------------------------------
CREATE TABLE historial (
    id              INT             NOT NULL AUTO_INCREMENT,
    integrante_id   INT             NULL,
    mascota_id      INT             NULL,
    evento          VARCHAR(200)    NOT NULL,
    fecha           DATE            NOT NULL,
    descripcion     TEXT            NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_historial_integrante
        FOREIGN KEY (integrante_id) REFERENCES integrante(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_historial_mascota
        FOREIGN KEY (mascota_id) REFERENCES mascota(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_historial_perfil
        CHECK (
            (integrante_id IS NOT NULL AND mascota_id IS NULL)
            OR
            (integrante_id IS NULL AND mascota_id IS NOT NULL)
        )
);

-- ------------------------------------------------------------
-- 8. RECORDATORIO
-- Notificaciones programadas asociadas a usuario.
-- Opcionalmente vinculadas a una vacuna o tratamiento.
-- tipo: enum según las 3 categorías del sistema.
-- ------------------------------------------------------------
CREATE TABLE recordatorio (
    id              INT             NOT NULL AUTO_INCREMENT,
    usuario_id      INT             NOT NULL,
    vacuna_id       INT             NULL,
    tratamiento_id  INT             NULL,
    tipo            ENUM('vacuna', 'control', 'medicacion') NOT NULL,
    fecha_hora      DATETIME        NOT NULL,
    descripcion     VARCHAR(255)    NULL,
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,

    PRIMARY KEY (id),
    CONSTRAINT fk_recordatorio_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_recordatorio_vacuna
        FOREIGN KEY (vacuna_id) REFERENCES vacuna(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_recordatorio_tratamiento
        FOREIGN KEY (tratamiento_id) REFERENCES tratamiento(id)
        ON DELETE SET NULL
);
