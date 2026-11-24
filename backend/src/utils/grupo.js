//1 — Resolución de pertenencia a grupo — migrado a Prisma
const prisma = require('../config/prisma');
const { esIdValido } = require('./validacion');

async function resolverGrupoId(usuarioId) {
    const membresia = await prisma.grupoMiembro.findUnique({
        where: { usuarioId }
    });
    return membresia ? membresia.grupoId : null;
}

async function resolverMembresia(usuarioId) {
    const membresia = await prisma.grupoMiembro.findUnique({
        where: { usuarioId }
    });
    return membresia ? { grupo_id: membresia.grupoId, rol: membresia.rol } : null;
}

async function verificarPertenenciaDirecta(tabla, id, usuarioId) {
    const grupoId = await resolverGrupoId(usuarioId);
    if (!grupoId) return false;
    const model = tabla === 'integrante' ? prisma.integrante : prisma.mascota;
    const registro = await model.findFirst({
        where: { id: Number(id), grupoId }
    });
    return !!registro;
}

function extraerPadreUnico(origen, camposPadre) {
    const presentes = camposPadre.filter((campo) => origen[`${campo}_id`]);
    if (presentes.length !== 1) {
        return { error: `Debe indicar exactamente uno de: ${camposPadre.map((c) => `${c}_id`).join(', ')}.` };
    }
    const tipoPadre = presentes[0];
    // ERR-013: el id tiene que ser un entero positivo — "abc", "1.5" o un número
    // más grande que una columna Int terminaban en un 500 al llegar a Prisma.
    if (!esIdValido(origen[`${tipoPadre}_id`])) {
        return { error: `El campo ${tipoPadre}_id debe ser un número entero positivo.` };
    }
    const padreId = Number(origen[`${tipoPadre}_id`]);
    return { tipoPadre, padreId };
}

module.exports = { resolverGrupoId, resolverMembresia, verificarPertenenciaDirecta, extraerPadreUnico };