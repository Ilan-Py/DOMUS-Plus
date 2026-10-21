// Controlador de recordatorios (CU8, CU9)
// Recordatorio es compartido por grupo — grupo_id es el límite de pertenencia,
// creado_por registra quién lo creó pero no filtra.
const prisma = require('../config/prisma');
const { resolverGrupoId } = require('../utils/grupo');

const TIPOS_VALIDOS = ['vacuna', 'control', 'medicacion'];

async function crearRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const { vacuna_id, tratamiento_id, tipo, fecha_hora, descripcion } = req.body;

    if (!tipo || !fecha_hora) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'tipo y fecha_hora son obligatorios.' });
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}.` });
    }
    if (new Date(fecha_hora) <= new Date()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha del recordatorio debe ser futura.' });
    }

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe pertenecer a un grupo familiar primero.' });
        }

        const nuevo = await prisma.recordatorio.create({
            data: {
                grupoId,
                creadoPor:     usuarioId,
                vacunaId:      vacuna_id      ? Number(vacuna_id)      : null,
                tratamientoId: tratamiento_id ? Number(tratamiento_id) : null,
                tipo,
                fechaHora:     new Date(fecha_hora),
                descripcion:   descripcion || null
            },
            select: { id: true, tipo: true, fechaHora: true }
        });

        return res.status(201).json({ codigo: 201, estado: 'ok', datos: nuevo });
    } catch (err) {
        console.error('crearRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// CU9 — Todos los miembros del grupo ven los mismos recordatorios
async function listarRecordatorios(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(200).json({ codigo: 200, estado: 'ok', datos: [] });
        }

        const recordatorios = await prisma.recordatorio.findMany({
            where: { grupoId },
            orderBy: { fechaHora: 'asc' },
            select: {
                id: true, vacunaId: true, tratamientoId: true,
                tipo: true, fechaHora: true, descripcion: true,
                activo: true, creadoPor: true
            }
        });

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: recordatorios });
    } catch (err) {
        console.error('listarRecordatorios=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// vacuna_id/tratamiento_id no se editan — el vínculo no es reasignable
async function editarRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const id = Number(req.params.id);
    const { tipo, fecha_hora, descripcion } = req.body;

    if (!tipo || !fecha_hora) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'tipo y fecha_hora son obligatorios.' });
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}.` });
    }
    if (new Date(fecha_hora) <= new Date()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha del recordatorio debe ser futura.' });
    }

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }

        const resultado = await prisma.recordatorio.updateMany({
            where: { id, grupoId },
            data: { tipo, fechaHora: new Date(fecha_hora), descripcion: descripcion || null }
        });
        if (resultado.count === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id, tipo, fecha_hora, descripcion: descripcion || null } });
    } catch (err) {
        console.error('editarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const id = Number(req.params.id);

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }

        const resultado = await prisma.recordatorio.deleteMany({
            where: { id, grupoId }
        });
        if (resultado.count === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id } });
    } catch (err) {
        console.error('eliminarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function desactivarRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const id = Number(req.params.id);

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }

        const resultado = await prisma.recordatorio.updateMany({
            where: { id, grupoId },
            data: { activo: false }
        });
        if (resultado.count === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Recordatorio desactivado.' });
    } catch (err) {
        console.error('desactivarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { crearRecordatorio, listarRecordatorios, editarRecordatorio, eliminarRecordatorio, desactivarRecordatorio };
