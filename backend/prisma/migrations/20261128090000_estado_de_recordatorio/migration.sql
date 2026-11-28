-- Marca de cada recordatorio (docs/ux/02-auditoria.md DOS-02/DOS-03): pendiente, hecho u omitido («no se dio»),
-- cuándo pasó y quién lo marcó. `activo` sigue existiendo y queda en sincronía (activo = estado pendiente).

-- CreateEnum
CREATE TYPE "EstadoRecordatorio" AS ENUM ('pendiente', 'hecho', 'omitido');

-- AlterTable
ALTER TABLE "recordatorio" ADD COLUMN     "estado" "EstadoRecordatorio" NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "hecho_a" TIMESTAMP(3),
ADD COLUMN     "hecho_por" INTEGER;

-- Los que ya estaban desactivados se marcaron como hechos con la versión anterior (no se sabe cuándo ni quién).
UPDATE "recordatorio" SET "estado" = 'hecho' WHERE "activo" = false;

-- AddForeignKey
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_hecho_por_fkey" FOREIGN KEY ("hecho_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
