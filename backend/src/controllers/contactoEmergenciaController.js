// Controlador de contactos de emergencia — uno-a-muchos por integrante.
// No polimórfico: el único padre posible es integrante_id.
const prisma = require('../config/db');
const { verificarPertenenciaDirecta } = require('../utils/grupo');

// POST /api/familia/integrantes/:id/contactos-emergencia
async function crearContacto(req, res) {
    const usuarioId    = req.usuario.id;
    const integranteId = Number(req.params.id);
    const { nombre, telefono, relacion } = req.body;

    if (!nombre || !nombre.trim() || !telefono || !telefono.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre y telefono son obligatorios.' });
    }

    try {
        const pertenece = await verificarPertenenciaDirecta('integrante', integranteId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante no encontrado.' });
        }

        const nuevo = await prisma.contactoEmergencia.create({
            data: {
                integranteId,
                nombre:   nombre.trim(),
                telefono: telefono.trim(),
                relacion: relacion || null
            },
            select: { id: true, nombre: true, telefono: true, relacion: true }
        });

        return res.status(201).json({ codigo: 201, estado: 'ok', datos: nuevo });
    } catch (err) {
        console.error('crearContacto=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// GET /api/familia/integrantes/:id/contactos-emergencia
async function listarContactos(req, res) {
    const usuarioId    = req.usuario.id;
    const integranteId = Number(req.params.id);

    try {
        const pertenece = await verificarPertenenciaDirecta('integrante', integranteId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante no encontrado.' });
        }

        const contactos = await prisma.contactoEmergencia.findMany({
            where: { integranteId },
            orderBy: { id: 'asc' },
            select: { id: true, nombre: true, telefono: true, relacion: true }
        });

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: contactos });
    } catch (err) {
        console.error('listarContactos=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// PATCH /api/familia/contactos-emergencia/:id
async function editarContacto(req, res) {
    const usuarioId = req.usuario.id;
    const id        = Number(req.params.id);
    const { nombre, telefono, relacion } = req.body;

    if (!nombre || !nombre.trim() || !telefono || !telefono.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre y telefono son obligatorios.' });
    }

    try {
        const contacto = await prisma.contactoEmergencia.findUnique({
            where: { id },
            select: { integranteId: true }
        });
        if (!contacto) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Contacto no encontrado.' });
        }

        const pertenece = await verificarPertenenciaDirecta('integrante', contacto.integranteId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Contacto no encontrado.' });
        }

        await prisma.contactoEmergencia.update({
            where: { id },
            data: { nombre: nombre.trim(), telefono: telefono.trim(), relacion: relacion || null }
        });

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id, nombre: nombre.trim(), telefono: telefono.trim(), relacion: relacion || null } });
    } catch (err) {
        console.error('editarContacto=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// DELETE /api/familia/contactos-emergencia/:id
async function eliminarContacto(req, res) {
    const usuarioId = req.usuario.id;
    const id        = Number(req.params.id);

    try {
        const contacto = await prisma.contactoEmergencia.findUnique({
            where: { id },
            select: { integranteId: true }
        });
        if (!contacto) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Contacto no encontrado.' });
        }

        const pertenece = await verificarPertenenciaDirecta('integrante', contacto.integranteId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Contacto no encontrado.' });
        }

        await prisma.contactoEmergencia.delete({ where: { id } });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id } });
    } catch (err) {
        console.error('eliminarContacto=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { crearContacto, listarContactos, editarContacto, eliminarContacto };
