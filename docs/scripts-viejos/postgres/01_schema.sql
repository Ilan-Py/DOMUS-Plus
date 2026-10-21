-- ============================================================
-- DOMUS+ | Esquema consolidado para Postgres (Supabase)
-- Reemplaza la secuencia MySQL 01_schema.sql -> 05_emergencia.sql:
-- en vez de reproducir las 5 migraciones incrementales (que existían para
-- alterar una base MySQL ya poblada sin perder datos), esto define
-- directamente el estado FINAL resultante de aplicarlas todas en orden.
-- Los 5 scripts originales de Scripts/*.sql se conservan tal cual como
-- historial/documentación de cómo se llegó a este esquema — no se ejecutan
-- más.
--
-- Motor: PostgreSQL 15+ (Supabase)
-- ============================================================

-- client_encoding en UTF8 explícito antes de cualquier DDL con literales
-- no-ASCII ('dueño' del ENUM de rol más abajo). El bug real que esto evita
-- en MySQL (mojibake por negociación de charset del cliente, ver
-- Scripts/03_grupo_compartido.sql) es mucho menos probable acá: toda
-- database de Supabase se crea en UTF8 sin alternativa, y tanto psql como
-- el SQL Editor web de Supabase asumen UTF8 por default en cualquier
-- sistema moderno — pero es una línea gratis y mantiene el mismo hábito
-- defensivo en vez de asumir que "en Postgres no hace falta".
SET client_encoding = 'UTF8';

-- ------------------------------------------------------------
-- Tipos ENUM
-- Postgres no tiene ENUM inline como MySQL — se declara un tipo aparte y se
-- referencia por nombre en la columna. Se usa ENUM (no VARCHAR + CHECK) acá
-- porque cada uno de estos sets de valores es fijo y pequeño, igual que en
-- el MySQL original, y un tipo con nombre documenta la intención mejor que
-- un CHECK repetido en cada tabla.
-- ------------------------------------------------------------
CREATE TYPE tipo_integrante      AS ENUM ('adulto', 'menor', 'mayor');
CREATE TYPE rol_miembro          AS ENUM ('dueño', 'miembro');
CREATE TYPE tipo_recordatorio    AS ENUM ('vacuna', 'control', 'medicacion');
CREATE TYPE tipo_archivo_adjunto AS ENUM ('imagen', 'pdf');

-- ------------------------------------------------------------
-- 1. USUARIO
-- ------------------------------------------------------------
CREATE TABLE usuario (
    id            INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        VARCHAR(100)    NOT NULL,
    apellido      VARCHAR(100)    NOT NULL,
    email         VARCHAR(150)    NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_usuario_email UNIQUE (email)
);

-- ------------------------------------------------------------
-- 2. GRUPO_FAMILIAR
-- Estado final post-03_grupo_compartido.sql: ya no tiene usuario_id propio
-- (1:1 con el dueño) — la pertenencia es siempre vía grupo_miembro. Trae
-- directamente codigo_invitacion (agregado en esa misma migración).
-- ------------------------------------------------------------
CREATE TABLE grupo_familiar (
    id                INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre            VARCHAR(150)    NOT NULL,
    codigo_invitacion VARCHAR(10)     NULL,
    created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_codigo_invitacion UNIQUE (codigo_invitacion)
);

-- ------------------------------------------------------------
-- 3. GRUPO_MIEMBRO
-- Un grupo puede tener varios usuarios; cada usuario pertenece a lo sumo a
-- un grupo activo a la vez (uq_miembro_usuario).
-- ------------------------------------------------------------
CREATE TABLE grupo_miembro (
    id          INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grupo_id    INT             NOT NULL,
    usuario_id  INT             NOT NULL,
    rol         rol_miembro     NOT NULL DEFAULT 'miembro',
    joined_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_miembro_usuario UNIQUE (usuario_id),
    CONSTRAINT fk_miembro_grupo
        FOREIGN KEY (grupo_id) REFERENCES grupo_familiar(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_miembro_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 4. INTEGRANTE
-- Incluye los campos de ficha de emergencia agregados en 05_emergencia.sql
-- (alergias, tipo_sangre, notas_emergencia) directamente en la tabla.
-- ------------------------------------------------------------
CREATE TABLE integrante (
    id                  INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grupo_id            INT             NOT NULL,
    nombre              VARCHAR(100)    NOT NULL,
    apellido            VARCHAR(100)    NOT NULL,
    fecha_nacimiento    DATE            NOT NULL,
    tipo                tipo_integrante NOT NULL DEFAULT 'adulto',
    observaciones       TEXT            NULL,
    alergias            TEXT            NULL,
    tipo_sangre         VARCHAR(10)     NULL,
    notas_emergencia    TEXT            NULL,

    CONSTRAINT fk_integrante_grupo
        FOREIGN KEY (grupo_id) REFERENCES grupo_familiar(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 5. MASCOTA
-- ------------------------------------------------------------
CREATE TABLE mascota (
    id                  INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grupo_id            INT             NOT NULL,
    nombre              VARCHAR(100)    NOT NULL,
    especie             VARCHAR(50)     NOT NULL,
    raza                VARCHAR(100)    NULL,
    fecha_nacimiento    DATE            NULL,

    CONSTRAINT fk_mascota_grupo
        FOREIGN KEY (grupo_id) REFERENCES grupo_familiar(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 6. VACUNA
-- Solo uno de (integrante_id, mascota_id) debe estar poblado. Este CHECK
-- usa pura lógica booleana (AND/OR/IS NOT NULL) — se traduce sin cambios a
-- Postgres, a diferencia de chk_adjunto_un_padre/chk_profesional_un_padre
-- más abajo (ver nota ahí sobre por qué esos SÍ necesitan casteo explícito).
-- ------------------------------------------------------------
CREATE TABLE vacuna (
    id               INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    integrante_id    INT             NULL,
    mascota_id       INT             NULL,
    nombre           VARCHAR(150)    NOT NULL,
    fecha_aplicacion DATE            NOT NULL,
    proxima_dosis    DATE            NULL,
    notas            TEXT            NULL,

    CONSTRAINT fk_vacuna_integrante
        FOREIGN KEY (integrante_id) REFERENCES integrante(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_vacuna_mascota
        FOREIGN KEY (mascota_id) REFERENCES mascota(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_vacuna_perfil
        CHECK (
            (integrante_id IS NOT NULL AND mascota_id IS NULL)
            OR
            (integrante_id IS NULL AND mascota_id IS NOT NULL)
        ),
    CONSTRAINT chk_vacuna_fechas
        CHECK (proxima_dosis IS NULL OR proxima_dosis > fecha_aplicacion)
);

-- ------------------------------------------------------------
-- 7. TRATAMIENTO
-- ------------------------------------------------------------
CREATE TABLE tratamiento (
    id              INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    integrante_id   INT             NULL,
    mascota_id      INT             NULL,
    descripcion     VARCHAR(255)    NOT NULL,
    medicacion      VARCHAR(200)    NOT NULL,
    fecha_inicio    DATE            NOT NULL,
    fecha_fin       DATE            NULL,

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
-- 8. HISTORIAL
-- ------------------------------------------------------------
CREATE TABLE historial (
    id              INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    integrante_id   INT             NULL,
    mascota_id      INT             NULL,
    evento          VARCHAR(200)    NOT NULL,
    fecha           DATE            NOT NULL,
    descripcion     TEXT            NULL,

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
-- 9. RECORDATORIO
-- Estado final post-03_grupo_compartido.sql: compartido por grupo
-- (grupo_id NOT NULL, límite real de pertenencia) en vez de por-usuario.
-- La columna original usuario_id se conserva renombrada a creado_por
-- (atribución de quién lo creó) con su FK original intacta.
-- DATETIME de MySQL -> TIMESTAMP (sin timezone) en Postgres: equivalente
-- directo, ninguno de los dos guardaba offset de zona horaria.
-- ------------------------------------------------------------
CREATE TABLE recordatorio (
    id              INT                 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grupo_id        INT                 NOT NULL,
    creado_por      INT                 NOT NULL,
    vacuna_id       INT                 NULL,
    tratamiento_id  INT                 NULL,
    tipo            tipo_recordatorio   NOT NULL,
    fecha_hora      TIMESTAMP           NOT NULL,
    descripcion     VARCHAR(255)        NULL,
    activo          BOOLEAN             NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_recordatorio_grupo
        FOREIGN KEY (grupo_id) REFERENCES grupo_familiar(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_recordatorio_usuario
        FOREIGN KEY (creado_por) REFERENCES usuario(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_recordatorio_vacuna
        FOREIGN KEY (vacuna_id) REFERENCES vacuna(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_recordatorio_tratamiento
        FOREIGN KEY (tratamiento_id) REFERENCES tratamiento(id)
        ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 10. ADJUNTO (04_adjuntos.sql)
-- Polimórfica de 5 padres posibles, "exactamente uno poblado".
-- IMPORTANTE: a diferencia de chk_vacuna_perfil/chk_tratamiento_perfil/
-- chk_historial_perfil (2 padres, pura lógica booleana AND/OR), el MySQL
-- original para 5 padres suma booleanos con `+` y compara contra 1 —
-- MySQL castea bool->int implícitamente en aritmética, Postgres NO (un
-- `boolean + boolean` tira "operator does not exist"). Traducido acá con
-- casteo ::int explícito en cada término — sin esto la migración fallaría
-- ruidosamente al crear la tabla (falla alta, no silenciosa, pero hay que
-- resolverla correctamente, no solo "hacer que compile").
-- ------------------------------------------------------------
CREATE TABLE adjunto (
    id              INT                     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vacuna_id       INT                     NULL,
    tratamiento_id  INT                     NULL,
    historial_id    INT                     NULL,
    integrante_id   INT                     NULL,
    mascota_id      INT                     NULL,
    tipo_archivo    tipo_archivo_adjunto    NOT NULL,
    url             VARCHAR(500)            NOT NULL,
    public_id       VARCHAR(255)            NOT NULL,
    nombre_original VARCHAR(255)            NULL,
    subido_por      INT                     NOT NULL,
    subido_en       TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_adjunto_vacuna FOREIGN KEY (vacuna_id) REFERENCES vacuna(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjunto_tratamiento FOREIGN KEY (tratamiento_id) REFERENCES tratamiento(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjunto_historial FOREIGN KEY (historial_id) REFERENCES historial(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjunto_integrante FOREIGN KEY (integrante_id) REFERENCES integrante(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjunto_mascota FOREIGN KEY (mascota_id) REFERENCES mascota(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjunto_usuario FOREIGN KEY (subido_por) REFERENCES usuario(id),
    CONSTRAINT chk_adjunto_un_padre CHECK (
        (vacuna_id IS NOT NULL)::int + (tratamiento_id IS NOT NULL)::int + (historial_id IS NOT NULL)::int
        + (integrante_id IS NOT NULL)::int + (mascota_id IS NOT NULL)::int = 1
    )
);

-- ------------------------------------------------------------
-- 11. CONTACTO_EMERGENCIA (05_emergencia.sql)
-- No polimórfica — único padre posible es integrante_id, sin CHECK de
-- "un solo padre" porque no hay otro padre con el que confundirse.
-- ------------------------------------------------------------
CREATE TABLE contacto_emergencia (
    id              INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    integrante_id   INT             NOT NULL,
    nombre          VARCHAR(150)    NOT NULL,
    telefono        VARCHAR(30)     NOT NULL,
    relacion        VARCHAR(100)    NULL,

    CONSTRAINT fk_contacto_integrante
        FOREIGN KEY (integrante_id) REFERENCES integrante(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 12. PROFESIONAL_SALUD (05_emergencia.sql)
-- Polimórfica de 2 padres (integrante, mascota) — mismo cuidado de casteo
-- ::int que chk_adjunto_un_padre más arriba, ver esa nota.
-- ------------------------------------------------------------
CREATE TABLE profesional_salud (
    id              INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    integrante_id   INT             NULL,
    mascota_id      INT             NULL,
    nombre          VARCHAR(150)    NOT NULL,
    especialidad    VARCHAR(100)    NULL,
    telefono        VARCHAR(30)     NULL,
    direccion       VARCHAR(255)    NULL,
    notas           TEXT            NULL,

    CONSTRAINT fk_profesional_integrante
        FOREIGN KEY (integrante_id) REFERENCES integrante(id) ON DELETE CASCADE,
    CONSTRAINT fk_profesional_mascota
        FOREIGN KEY (mascota_id) REFERENCES mascota(id) ON DELETE CASCADE,
    CONSTRAINT chk_profesional_un_padre CHECK (
        (integrante_id IS NOT NULL)::int + (mascota_id IS NOT NULL)::int = 1
    )
);
