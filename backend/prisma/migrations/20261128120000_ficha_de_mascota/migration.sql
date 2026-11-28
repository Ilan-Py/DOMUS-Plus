-- Ficha rápida de la mascota (sexo, castrado, microchip), nota para quien la cuide y registro de peso.

-- AlterTable
ALTER TABLE "mascota" ADD COLUMN     "castrado" BOOLEAN,
ADD COLUMN     "microchip" VARCHAR(30),
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "sexo" VARCHAR(10);

-- CreateTable
CREATE TABLE "peso" (
    "id" SERIAL NOT NULL,
    "integrante_id" INTEGER,
    "mascota_id" INTEGER,
    "fecha" DATE NOT NULL,
    "kg" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "peso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "peso_mascota_id_idx" ON "peso"("mascota_id");

-- CreateIndex
CREATE INDEX "peso_integrante_id_idx" ON "peso"("integrante_id");

-- AddForeignKey
ALTER TABLE "peso" ADD CONSTRAINT "peso_integrante_id_fkey" FOREIGN KEY ("integrante_id") REFERENCES "integrante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peso" ADD CONSTRAINT "peso_mascota_id_fkey" FOREIGN KEY ("mascota_id") REFERENCES "mascota"("id") ON DELETE CASCADE ON UPDATE CASCADE;
