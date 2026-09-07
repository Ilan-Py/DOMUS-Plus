//Codigo por ILAN PITASHNY
//1 — Controlador de recordatorios (CU8, CU9)
// Fase 4 (grupos compartidos): recordatorio pasó de ser por-usuario a ser
// compartido por grupo — el límite de pertenencia ahora es grupo_id (vía
// grupo_miembro), no usuario_id. usuario_id se conserva como creado_por
// (atribución de quién lo creó, ver Scripts/03_grupo_compartido.sql) pero
// ya no filtra nada.
const db = require('../config/db');
const { resolverGrupoId } = require('../utils/grupo');

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
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe pertenecer a un grupo familiar primero.' });
        }

        const result = await db.query(
            'INSERT INTO recordatorio (grupo_id, creado_por, vacuna_id, tratamiento_id, tipo, fecha_hora, descripcion) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [grupoId, usuarioId, vacuna_id || null, tratamiento_id || null, tipo, fecha_hora, descripcion || null]
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: result.rows[0].id, tipo, fecha_hora } });
    } catch (err) {
        console.error('crearRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//3 — CU9: Listar recordatorios del GRUPO (para calendario) — todos los
// miembros ven los mismos recordatorios, no sólo los que cada uno creó.
async function listarRecordatorios(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const { rows } = await db.query(
            `SELECT r.id, r.vacuna_id, r.tratamiento_id, r.tipo, r.fecha_hora, r.descripcion, r.activo, r.creado_por
             FROM recordatorio r
             JOIN grupo_miembro gm ON gm.grupo_id = r.grupo_id
             WHERE gm.usuario_id = $1
             ORDER BY r.fecha_hora ASC`,
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
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }

        const result = await db.query(
            'UPDATE recordatorio SET tipo = $1, fecha_hora = $2, descripcion = $3 WHERE id = $4 AND grupo_id = $5',
            [tipo, fecha_hora, descripcion || null, id, grupoId]
        );
        if (result.rowCount === 0) {
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
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }

        const result = await db.query(
            'DELETE FROM recordatorio WHERE id = $1 AND grupo_id = $2',
            [id, grupoId]
        );
        if (result.rowCount === 0) {
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
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }

        const result = await db.query(
            'UPDATE recordatorio SET activo = FALSE WHERE id = $1 AND grupo_id = $2',
            [id, grupoId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Recordatorio no encontrado.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Recordatorio desactivado.' });
    } catch (err) {
        console.error('desactivarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { crearRecordatorio, listarRecordatorios, editarRecordatorio, eliminarRecordatorio, desactivarRecordatorio };
