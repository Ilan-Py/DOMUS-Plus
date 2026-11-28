// Controlador de pesos (libreta sanitaria: gráfico de evolución del peso de una mascota o un integrante).
// Mismas reglas de pertenencia que vacunas y tratamientos: el integrante o la mascota tiene que ser del grupo
// del usuario (padreEsDelUsuario) antes de leer o escribir; para borrar se verifica el padre del registro.
const prisma = require('../config/prisma');
const { esIdValido, validarCampos, FECHA_MINIMA, hoy } = require('../utils/validacion');
const { verificarPertenenciaDirecta } = require('../utils/grupo');

const REGLAS_PESO = {
    integrante_id: { tipo: 'id', etiqueta: 'integrante_id' },
    mascota_id:    { tipo: 'id', etiqueta: 'mascota_id' },
    fecha: {
        tipo: 'fecha', etiqueta: 'fecha', desde: FECHA_MINIMA, hasta: hoy,
        mensajeDesde: 'Revisá el año de la fecha.', mensajeHasta: 'La fecha del peso no puede ser después de hoy.'
    }
};
const KG_MAXIMO = 1000;

async function padreEsDelUsuario(integrante_id, mascota_id, usuarioId) {
    const tipo  = integrante_id ? 'integrante' : 'mascota';
    const valor = integrante_id || mascota_id;
    if (!esIdValido(valor)) return false;
    return verificarPertenenciaDirecta(tipo, Number(valor), usuarioId);
}

// GET /api/salud/pesos?mascota_id=… | ?integrante_id=…  → [{ id, fecha, kg }] del más viejo al más nuevo
async function listarPesos(req, res) {
    const usuarioId = req.usuario.id;
    const { integrante_id, mascota_id } = req.query;
    if (!integrante_id && !mascota_id) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Indicá de quién son los pesos.' });
    }
    try {
        if (!(await padreEsDelUsuario(integrante_id, mascota_id, usuarioId))) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante o mascota no encontrado.' });
        }
        const where = integrante_id ? { integranteId: Number(integrante_id) } : { mascotaId: Number(mascota_id) };
        const pesos = await prisma.peso.findMany({ where, orderBy: { fecha: 'asc' }, select: { id: true, fecha: true, kg: true } });
        // Decimal de Prisma → número, para que el front pueda graficar sin convertir.
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: pesos.map((p) => ({ ...p, kg: Number(p.kg) })) });
    } catch (err) {
        console.error('listarPesos=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// POST /api/salud/pesos  { mascota_id | integrante_id, kg, fecha? (hoy) }
async function registrarPeso(req, res) {
    const usuarioId = req.usuario.id;
    const { integrante_id, mascota_id, fecha } = req.body;
    const kg = Number(String(req.body.kg ?? '').replace(',', '.'));

    const errorCampos = validarCampos(req.body, REGLAS_PESO);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }
    if (!integrante_id && !mascota_id) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Indicá de quién es el peso.' });
    }
    if (integrante_id && mascota_id) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Solo puede indicarse integrante_id o mascota_id, no ambos.' });
    }
    if (!Number.isFinite(kg) || kg <= 0 || kg > KG_MAXIMO) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Escribí el peso en kilos (por ejemplo, 18,5).' });
    }

    try {
        if (!(await padreEsDelUsuario(integrante_id, mascota_id, usuarioId))) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante o mascota no encontrado.' });
        }
        const nuevo = await prisma.peso.create({
            data: {
                integranteId: integrante_id ? Number(integrante_id) : null,
                mascotaId:    mascota_id ? Number(mascota_id) : null,
                fecha:        fecha ? new Date(fecha) : new Date(new Date().toDateString()),
                kg:           Math.round(kg * 100) / 100
            },
            select: { id: true, fecha: true, kg: true }
        });
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { ...nuevo, kg: Number(nuevo.kg) } });
    } catch (err) {
        console.error('registrarPeso=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// DELETE /api/salud/pesos/:id
async function eliminarPeso(req, res) {
    const usuarioId = req.usuario.id;
    const id = Number(req.params.id);
    try {
        const peso = await prisma.peso.findUnique({ where: { id }, select: { integranteId: true, mascotaId: true } });
        if (!peso || !(await padreEsDelUsuario(peso.integranteId, peso.mascotaId, usuarioId))) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No encontramos ese peso.' });
        }
        await prisma.peso.delete({ where: { id } });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id } });
    } catch (err) {
        console.error('eliminarPeso=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { listarPesos, registrarPeso, eliminarPeso };
