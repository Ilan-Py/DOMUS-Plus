-- CreateEnum
CREATE TYPE "TipoIntegrante" AS ENUM ('adulto', 'menor', 'mayor');

-- CreateEnum
CREATE TYPE "rol_miembro" AS ENUM ('dueno', 'miembro');

-- CreateEnum
CREATE TYPE "TipoRecordatorio" AS ENUM ('vacuna', 'control', 'medicacion');

-- CreateEnum
CREATE TYPE "TipoArchivoAdjunto" AS ENUM ('imagen', 'pdf');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupo_familiar" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "codigo_invitacion" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupo_familiar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupo_miembro" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "rol" "rol_miembro" NOT NULL DEFAULT 'miembro',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupo_miembro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrante" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "fecha_nacimiento" DATE NOT NULL,
    "tipo" "TipoIntegrante" NOT NULL DEFAULT 'adulto',
    "observaciones" TEXT,
    "alergias" TEXT,
    "tipo_sangre" VARCHAR(10),
    "notas_emergencia" TEXT,

    CONSTRAINT "integrante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mascota" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "especie" VARCHAR(50) NOT NULL,
    "raza" VARCHAR(100),
    "fecha_nacimiento" DATE,

    CONSTRAINT "mascota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacuna" (
    "id" SERIAL NOT NULL,
    "integrante_id" INTEGER,
    "mascota_id" INTEGER,
    "nombre" VARCHAR(150) NOT NULL,
    "fecha_aplicacion" DATE NOT NULL,
    "proxima_dosis" DATE,
    "notas" TEXT,

    CONSTRAINT "vacuna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tratamiento" (
    "id" SERIAL NOT NULL,
    "integrante_id" INTEGER,
    "mascota_id" INTEGER,
    "descripcion" VARCHAR(255) NOT NULL,
    "medicacion" VARCHAR(200) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,

    CONSTRAINT "tratamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial" (
    "id" SERIAL NOT NULL,
    "integrante_id" INTEGER,
    "mascota_id" INTEGER,
    "evento" VARCHAR(200) NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordatorio" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "creado_por" INTEGER NOT NULL,
    "vacuna_id" INTEGER,
    "tratamiento_id" INTEGER,
    "tipo" "TipoRecordatorio" NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL,
    "descripcion" VARCHAR(255),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recordatorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjunto" (
    "id" SERIAL NOT NULL,
    "vacuna_id" INTEGER,
    "tratamiento_id" INTEGER,
    "historial_id" INTEGER,
    "integrante_id" INTEGER,
    "mascota_id" INTEGER,
    "tipo_archivo" "TipoArchivoAdjunto" NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "nombre_original" VARCHAR(255),
    "subido_por" INTEGER NOT NULL,
    "subido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjunto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacto_emergencia" (
    "id" SERIAL NOT NULL,
    "integrante_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(30) NOT NULL,
    "relacion" VARCHAR(100),

    CONSTRAINT "contacto_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profesional_salud" (
    "id" SERIAL NOT NULL,
    "integrante_id" INTEGER,
    "mascota_id" INTEGER,
    "nombre" VARCHAR(150) NOT NULL,
    "especialidad" VARCHAR(100),
    "telefono" VARCHAR(30),
    "direccion" VARCHAR(255),
    "notas" TEXT,

    CONSTRAINT "profesional_salud_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_familiar_codigo_invitacion_key" ON "grupo_familiar"("codigo_invitacion");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_miembro_usuario_id_key" ON "grupo_miembro"("usuario_id");

-- AddForeignKey
ALTER TABLE "grupo_miembro" ADD CONSTRAINT "grupo_miembro_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo_familiar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo_miembro" ADD CONSTRAINT "grupo_miembro_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrante" ADD CONSTRAINT "integrante_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo_familiar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascota" ADD CONSTRAINT "mascota_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo_familiar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacuna" ADD CONSTRAINT "vacuna_integrante_id_fkey" FOREIGN KEY ("integrante_id") REFERENCES "integrante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacuna" ADD CONSTRAINT "vacuna_mascota_id_fkey" FOREIGN KEY ("mascota_id") REFERENCES "mascota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tratamiento" ADD CONSTRAINT "tratamiento_integrante_id_fkey" FOREIGN KEY ("integrante_id") REFERENCES "integrante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tratamiento" ADD CONSTRAINT "tratamiento_mascota_id_fkey" FOREIGN KEY ("mascota_id") REFERENCES "mascota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial" ADD CONSTRAINT "historial_integrante_id_fkey" FOREIGN KEY ("integrante_id") REFERENCES "integrante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial" ADD CONSTRAINT "historial_mascota_id_fkey" FOREIGN KEY ("mascota_id") REFERENCES "mascota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo_familiar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_vacuna_id_fkey" FOREIGN KEY ("vacuna_id") REFERENCES "vacuna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_tratamiento_id_fkey" FOREIGN KEY ("tratamiento_id") REFERENCES "tratamiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjunto" ADD CONSTRAINT "adjunto_vacuna_id_fkey" FOREIGN KEY ("vacuna_id") REFERENCES "vacuna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjunto" ADD CONSTRAINT "adjunto_tratamiento_id_fkey" FOREIGN KEY ("tratamiento_id") REFERENCES "tratamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjunto" ADD CONSTRAINT "adjunto_historial_id_fkey" FOREIGN KEY ("historial_id") REFERENCES "historial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjunto" ADD CONSTRAINT "adjunto_integrante_id_fkey" FOREIGN KEY ("integrante_id") REFERENCES "integrante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjunto" ADD CONSTRAINT "adjunto_mascota_id_fkey" FOREIGN KEY ("mascota_id") REFERENCES "mascota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjunto" ADD CONSTRAINT "adjunto_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacto_emergencia" ADD CONSTRAINT "contacto_emergencia_integrante_id_fkey" FOREIGN KEY ("integrante_id") REFERENCES "integrante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profesional_salud" ADD CONSTRAINT "profesional_salud_integrante_id_fkey" FOREIGN KEY ("integrante_id") REFERENCES "integrante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profesional_salud" ADD CONSTRAINT "profesional_salud_mascota_id_fkey" FOREIGN KEY ("mascota_id") REFERENCES "mascota"("id") ON DELETE CASCADE ON UPDATE CASCADE;
