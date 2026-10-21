// Controlador de profesionales de salud — polimórfico de 2 padres
// (integrante o mascota). Reutiliza verificarPertenenciaDirecta y
// extraerPadreUnico de utils/grupo.js.
const prisma = require('../config/prisma');
const { verificarPertenenciaDirecta, extraerPadreUnico } = require('../utils/grupo');

const CAMPOS_PADRE = ['integrante', 'mascota'];

// POST /api/salud/profesionales
async function crearProfesional(req, res) {
    const usuarioId = req.usuario.id;
    const { tipoPadre, padreId, error } = extraerPadreUnico(req.body, CAMPOS_PADRE);
    if (error) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: error });
    }

    const { nombre, especialidad, telefono, direccion, notas } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre es obligatorio.' });
    }

    try {
        const pertenece = await verificarPertenenciaDirecta(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Registro no encontrado.' });
        }

        const nuevo = await prisma.profesionalSalud.create({
            data: {
                integranteId: tipoPadre === 'integrante' ? padreId : null,
                mascotaId:    tipoPadre === 'mascota'    ? padreId : null,
                nombre:       nombre.trim(),
                especialidad: especialidad || null,
                telefono:     telefono     || null,
                direccion:    direccion    || null,
                notas:        notas        || null
            },
            select: { id: true, nombre: true, especialidad: true, telefono: true, direccion: true, notas: true }
        });

        return res.status(201).json({ codigo: 201, estado: 'ok', datos: nuevo });
    } catch (err) {
        console.error('crearProfesional=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// GET /api/salud/profesionales?integrante_id=X (o ?mascota_id=X)
async function listarProfesionales(req, res) {
    const usuarioId = req.usuario.id;
    const { tipoPadre, padreId, error } = extraerPadreUnico(req.query, CAMPOS_PADRE);
    if (error) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: error });
    }

    try {
        const pertenece = await verificarPertenenciaDirecta(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Registro no encontrado.' });
        }

        const where = tipoPadre === 'integrante'
            ? { integranteId: padreId }
            : { mascotaId:    padreId };

        const profesionales = await prisma.profesionalSalud.findMany({
            where,
            orderBy: { nombre: 'asc' },
            select: { id: true, nombre: true, especialidad: true, telefono: true, direccion: true, notas: true }
        });

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: profesionales });
    } catch (err) {
        console.error('listarProfesionales=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// PATCH /api/salud/profesionales/:id
async function editarProfesional(req, res) {
    const usuarioId = req.usuario.id;
    const id        = Number(req.params.id);
    const { nombre, especialidad, telefono, direccion, notas } = req.body;

    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre es obligatorio.' });
    }

    try {
        const profesional = await prisma.profesionalSalud.findUnique({ where: { id } });
        if (!profesional) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }

        const tipoPadre = profesional.integranteId !== null ? 'integrante' : 'mascota';
        const padreId   = profesional.integranteId ?? profesional.mascotaId;

        const pertenece = await verificarPertenenciaDirecta(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }

        await prisma.profesionalSalud.update({
            where: { id },
            data: {
                nombre:       nombre.trim(),
                especialidad: especialidad || null,
                telefono:     telefono     || null,
                direccion:    direccion    || null,
                notas:        notas        || null
            }
        });

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id, nombre: nombre.trim(), especialidad: especialidad || null, telefono: telefono || null, direccion: direccion || null, notas: notas || null } });
    } catch (err) {
        console.error('editarProfesional=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// DELETE /api/salud/profesionales/:id
async function eliminarProfesional(req, res) {
    const usuarioId = req.usuario.id;
    const id        = Number(req.params.id);

    try {
        const profesional = await prisma.profesionalSalud.findUnique({ where: { id } });
        if (!profesional) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }

        const tipoPadre = profesional.integranteId !== null ? 'integrante' : 'mascota';
        const padreId   = profesional.integranteId ?? profesional.mascotaId;

        const pertenece = await verificarPertenenciaDirecta(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }

        await prisma.profesionalSalud.delete({ where: { id } });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id } });
    } catch (err) {
        console.error('eliminarProfesional=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { crearProfesional, listarProfesionales, editarProfesional, eliminarProfesional };
