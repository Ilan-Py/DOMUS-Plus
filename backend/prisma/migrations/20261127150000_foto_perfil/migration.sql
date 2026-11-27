-- Foto de perfil opcional para integrantes y mascotas (escrita a mano siguiendo el formato de Prisma)
-- AlterTable
ALTER TABLE "integrante" ADD COLUMN     "foto_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "mascota" ADD COLUMN     "foto_url" VARCHAR(500);
