//1 — Cliente Prisma — reemplaza el pool de pg.
// Un solo PrismaClient por proceso (singleton) — instanciar varios
// abre conexiones innecesarias al pool interno de Prisma.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

prisma.$connect()
    .then(() => console.log('Base de datos conectada correctamente.'))
    .catch(err => {
        console.error('Error al conectar con la base de datos:', err.message);
        process.exit(1);
    });

module.exports = prisma;