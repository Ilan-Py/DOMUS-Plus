//Codigo por Claude
//1 — Controlador de contactos de emergencia (uno-a-muchos por integrante,
// ver Scripts/05_emergencia.sql). No es polimórfico — el único padre posible
// es integrante_id, así que verificarPertenenciaDirecta('integrante', ...)
// (utils/grupo.js, compartida con adjuntoController.js/
// profesionalSaludController.js) alcanza sin necesidad de extraerPadreUnico.
const db = require('../config/db');
const { verificarPertenenciaDirecta } = require('../utils/grupo');

//2 — POST /api/familia/integrantes/:id/contactos-emergencia
async function crearContacto(req, res) {
    const usuarioId = req.usuario.id;
    const integranteId = req.params.id;
    const { nombre, telefono, relacion } = req.body;

    if (!nombre || !nombre.trim() || !telefono || !telefono.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre y telefono son obligatorios.' });
    }

    try {
        const pertenece = await verificarPertenenciaDirecta('integrante', integranteId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante no encontrado.' });
        }

        const result = await db.query(
            'INSERT INTO contacto_emergencia (integrante_id, nombre, telefono, relacion) VALUES ($1, $2, $3, $4) RETURNING id',
            [integranteId, nombre.trim(), telefono.trim(), relacion || null]
        );
        return res.status(201).json({
            codigo: 201,
            estado: 'ok',
            datos: { id: result.rows[0].id, nombre: nombre.trim(), telefono: telefono.trim(), relacion: relacion || null },
        });
    } catch (err) {
        console.error('crearContacto=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//3 — GET /api/familia/integrantes/:id/contactos-emergencia
async function listarContactos(req, res) {
    const usuarioId = req.usuario.id;
    const integranteId = req.params.id;

    try {
        const pertenece = await verificarPertenenciaDirecta('integrante', integranteId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante no encontrado.' });
        }

        const { rows } = await db.query(
            'SELECT id, nombre, telefono, relacion FROM contacto_emergencia WHERE integrante_id = $1 ORDER BY id',
            [integranteId]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows });
    } catch (err) {
        console.error('listarContactos=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//4 — PATCH /api/familia/contactos-emergencia/:id
async function editarContacto(req, res) {
    const usuarioId = req.usuario.id;
    const { id } = req.params;
    const { nombre, telefono, relacion } = req.body;

    if (!nombre || !nombre.trim() || !telefono || !telefono.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre y telefono son obligatorios.' });
    }

    try {
        const { rows } = await db.query('SELECT integrante_id FROM contacto_emergencia WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Contacto no encontrado.' });
        }

        const pertenece = await verificarPertenenciaDirecta('integrante', rows[0].integrante_id, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Contacto no encontrado.' });
        }

        await db.query(
            'UPDATE contacto_emergencia SET nombre = $1, telefono = $2, relacion = $3 WHERE id = $4',
            [nombre.trim(), telefono.trim(), relacion || null, id]
        );
        return res.status(200).json({
            codigo: 200,
            estado: 'ok',
            datos: { id: Number(id), nombre: nombre.trim(), telefono: telefono.trim(), relacion: relacion || null },
        });
    } catch (err) {
        console.error('editarContacto=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//5 — DELETE /api/familia/contactos-emergencia/:id
async function eliminarContacto(req, res) {
    const usuarioId = req.usuario.id;
    const { id } = req.params;

    try {
        const { rows } = await db.query('SELECT integrante_id FROM contacto_emergencia WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Contacto no encontrado.' });
        }

        const pertenece = await verificarPertenenciaDirecta('integrante', rows[0].integrante_id, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Contacto no encontrado.' });
        }

        await db.query('DELETE FROM contacto_emergencia WHERE id = $1', [id]);
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(id) } });
    } catch (err) {
        console.error('eliminarContacto=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { crearContacto, listarContactos, editarContacto, eliminarContacto };
