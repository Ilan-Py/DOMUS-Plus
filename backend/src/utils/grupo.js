//1 — Resolución de pertenencia a grupo — migrado a Prisma
const prisma = require('../config/db');

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
    const padreId = origen[`${tipoPadre}_id`];
    return { tipoPadre, padreId };
}

module.exports = { resolverGrupoId, resolverMembresia, verificarPertenenciaDirecta, extraerPadreUnico };