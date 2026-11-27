-- Recordatorio: "para quién" es (integrante_id o mascota_id, opcionales). Escrita a mano
-- siguiendo el formato de Prisma.
-- AlterTable
ALTER TABLE "recordatorio" ADD COLUMN     "integrante_id" INTEGER,
ADD COLUMN     "mascota_id" INTEGER;

-- AddForeignKey
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_integrante_id_fkey" FOREIGN KEY ("integrante_id") REFERENCES "integrante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_mascota_id_fkey" FOREIGN KEY ("mascota_id") REFERENCES "mascota"("id") ON DELETE SET NULL ON UPDATE CASCADE;
