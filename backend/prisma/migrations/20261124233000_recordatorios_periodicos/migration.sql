-- MEJ-005: recordatorios periódicos (escrita a mano siguiendo el formato de Prisma)
-- AlterTable
ALTER TABLE "recordatorio" ADD COLUMN     "repeticion_dias" INTEGER,
ADD COLUMN     "serie_id" UUID;

-- CreateIndex
CREATE INDEX "recordatorio_serie_id_idx" ON "recordatorio"("serie_id");
