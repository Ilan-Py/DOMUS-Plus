-- Rol de sistema para el administrador (escrita a mano siguiendo el formato de Prisma)
-- CreateEnum
CREATE TYPE "rol_sistema" AS ENUM ('usuario', 'admin');

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "rol" "rol_sistema" NOT NULL DEFAULT 'usuario';
