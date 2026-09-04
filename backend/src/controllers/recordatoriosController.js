//Codigo por ILAN PITASHNY
//1 — Controlador de recordatorios (CU8, CU9)
const db = require('../config/db');

//2 — CU8: Crear recordatorio
async function crearRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const { vacuna_id, tratamiento_id, tipo, fecha_hora, descripcion } = req.body;

    if (!tipo || !fecha_hora) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'tipo y fecha_hora son obligatorios.' });
    }

    const tiposValidos = ['vacuna', 'control', 'medicacion'];
    if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: `tipo debe ser uno de: ${tiposValidos.join(', ')}.` });
    }

    if (new Date(fecha_hora) <= new Date()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha del recordatorio debe ser futura.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO recordatorio (usuario_id, vacuna_id, tratamiento_id, tipo, fecha_hora, descripcion) VALUES (?, ?, ?, ?, ?, ?)',
            [usuarioId, vacuna_id || null, tratamiento_id || null, tipo, fecha_hora, descripcion || null]
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: result.insertId, tipo, fecha_hora } });
    } catch (err) {
        console.error('crearRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//3 — CU9: Listar recordatorios del usuario (para calendario)
async function listarRecordatorios(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const [rows] = await db.query(
            `SELECT id, vacuna_id, tratamiento_id, tipo, fecha_hora, descripcion, activo
             FROM recordatorio
             WHERE usuario_id = ?
             ORDER BY fecha_hora ASC`,
            [usuarioId]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows });
    } catch (err) {
        console.error('listarRecordatorios=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//4 — Editar recordatorio (vacuna_id/tratamiento_id no se aceptan acá — el
// vínculo no es reasignable, mismo criterio que la edición de vacuna/tratamiento)
async function editarRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const { id } = req.params;
    const { tipo, fecha_hora, descripcion } = req.body;

    if (!tipo || !fecha_hora) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'tipo y fecha_hora son obligatorios.' });
    }

    const tiposValidos = ['vacuna', 'control', 'medicacion'];
    if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: `tipo debe ser uno de: ${tiposValidos.join(', ')}.` });
    }

    if (new Date(fecha_hora) <= new Date()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha del recordatorio debe ser futura.' });
    }

    try {
        const [result] = await db.query(
            'UPDATE recordatorio SET tipo = ?, fecha_hora = ?, descripcion = ? WHERE id = ? AND usuario_id = ?',
            [tipo, fecha_hora, descripcion || null, id, usuarioId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(id), tipo, fecha_hora, descripcion: descripcion || null } });
    } catch (err) {
        console.error('editarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//5 — Eliminar recordatorio
async function eliminarRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const { id } = req.params;
    try {
        const [result] = await db.query(
            'DELETE FROM recordatorio WHERE id = ? AND usuario_id = ?',
            [id, usuarioId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(id) } });
    } catch (err) {
        console.error('eliminarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//6 — Desactivar recordatorio
async function desactivarRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const { id } = req.params;
    try {
        const [result] = await db.query(
            'UPDATE recordatorio SET activo = FALSE WHERE id = ? AND usuario_id = ?',
            [id, usuarioId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Recordatorio desactivado.' });
    } catch (err) {
        console.error('desactivarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { crearRecordatorio, listarRecordatorios, editarRecordatorio, eliminarRecordatorio, desactivarRecordatorio };
