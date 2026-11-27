-- Avatar opcional (id del catálogo de la app, ej. "dog-floppy") para usuarios, integrantes y mascotas
-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "avatar_id" VARCHAR(40);

-- AlterTable
ALTER TABLE "integrante" ADD COLUMN     "avatar_id" VARCHAR(40);

-- AlterTable
ALTER TABLE "mascota" ADD COLUMN     "avatar_id" VARCHAR(40);
