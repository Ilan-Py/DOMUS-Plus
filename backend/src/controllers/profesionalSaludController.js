//Codigo por Claude
//1 — Controlador de profesionales de salud (veterinario/pediatra) para
// integrantes y mascotas — mismo patrón "un solo padre" que adjunto, pero
// con sólo 2 padres posibles (ver chk_profesional_un_padre en
// Scripts/05_emergencia.sql). Reusa verificarPertenenciaDirecta/
// extraerPadreUnico (utils/grupo.js) en vez de rearmar un sexto chequeo de
// pertenencia polimórfica desde cero.
const db = require('../config/db');
const { verificarPertenenciaDirecta, extraerPadreUnico } = require('../utils/grupo');

const CAMPOS_PADRE = ['integrante', 'mascota'];

//2 — POST /api/salud/profesionales
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

        const result = await db.query(
            `INSERT INTO profesional_salud (${tipoPadre}_id, nombre, especialidad, telefono, direccion, notas) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [padreId, nombre.trim(), especialidad || null, telefono || null, direccion || null, notas || null]
        );
        return res.status(201).json({
            codigo: 201,
            estado: 'ok',
            datos: {
                id: result.rows[0].id,
                nombre: nombre.trim(),
                especialidad: especialidad || null,
                telefono: telefono || null,
                direccion: direccion || null,
                notas: notas || null,
            },
        });
    } catch (err) {
        console.error('crearProfesional=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//3 — GET /api/salud/profesionales?integrante_id=X (o ?mascota_id=X)
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

        const { rows } = await db.query(
            `SELECT id, nombre, especialidad, telefono, direccion, notas
             FROM profesional_salud WHERE ${tipoPadre}_id = $1 ORDER BY nombre`,
            [padreId]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows });
    } catch (err) {
        console.error('listarProfesionales=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//4 — PATCH /api/salud/profesionales/:id
async function editarProfesional(req, res) {
    const usuarioId = req.usuario.id;
    const { id } = req.params;
    const { nombre, especialidad, telefono, direccion, notas } = req.body;

    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre es obligatorio.' });
    }

    try {
        const { rows } = await db.query('SELECT * FROM profesional_salud WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }
        const fila = rows[0];
        const tipoPadre = CAMPOS_PADRE.find((campo) => fila[`${campo}_id`] !== null);
        const padreId = fila[`${tipoPadre}_id`];

        const pertenece = await verificarPertenenciaDirecta(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }

        await db.query(
            'UPDATE profesional_salud SET nombre = $1, especialidad = $2, telefono = $3, direccion = $4, notas = $5 WHERE id = $6',
            [nombre.trim(), especialidad || null, telefono || null, direccion || null, notas || null, id]
        );
        return res.status(200).json({
            codigo: 200,
            estado: 'ok',
            datos: {
                id: Number(id),
                nombre: nombre.trim(),
                especialidad: especialidad || null,
                telefono: telefono || null,
                direccion: direccion || null,
                notas: notas || null,
            },
        });
    } catch (err) {
        console.error('editarProfesional=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//5 — DELETE /api/salud/profesionales/:id
async function eliminarProfesional(req, res) {
    const usuarioId = req.usuario.id;
    const { id } = req.params;

    try {
        const { rows } = await db.query('SELECT * FROM profesional_salud WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }
        const fila = rows[0];
        const tipoPadre = CAMPOS_PADRE.find((campo) => fila[`${campo}_id`] !== null);
        const padreId = fila[`${tipoPadre}_id`];

        const pertenece = await verificarPertenenciaDirecta(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }

        await db.query('DELETE FROM profesional_salud WHERE id = $1', [id]);
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(id) } });
    } catch (err) {
        console.error('eliminarProfesional=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { crearProfesional, listarProfesionales, editarProfesional, eliminarProfesional };
