-- Registro de actividad para el administrador (escrita a mano siguiendo el formato de Prisma)
-- CreateEnum
CREATE TYPE "accion_registro" AS ENUM ('login', 'alta', 'modificacion', 'eliminacion', 'consulta');

-- CreateTable
CREATE TABLE "registro_actividad" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" "accion_registro" NOT NULL,
    "entidad" VARCHAR(40),
    "entidad_id" INTEGER,
    "detalle" VARCHAR(200),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registro_actividad_fecha_idx" ON "registro_actividad"("fecha");

-- CreateIndex
CREATE INDEX "registro_actividad_usuario_id_idx" ON "registro_actividad"("usuario_id");

-- AddForeignKey
ALTER TABLE "registro_actividad" ADD CONSTRAINT "registro_actividad_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
