//Codigo por ILAN PITASHNY
//1 — Controlador de grupo familiar, integrantes y mascotas (CU3, CU4, CU5)
const db = require('../config/db');

//2 — Validacion: fecha no puede ser futura (CU4, CU5)
function esFechaFutura(fechaStr) {
    const fecha = new Date(fechaStr);
    const hoy   = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha > hoy;
}

// ──────────────────────────────────────────────
// CU3 — Grupo familiar
// ──────────────────────────────────────────────

async function crearGrupo(req, res) {
    const usuarioId = req.usuario.id;
    const { nombre } = req.body;

    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'El nombre del grupo es obligatorio.' });
    }

    try {
        const [existente] = await db.query(
            'SELECT id FROM grupo_familiar WHERE usuario_id = ?', [usuarioId]
        );
        if (existente.length > 0) {
            return res.status(409).json({ codigo: 409, estado: 'error', datos: 'Ya existe un grupo familiar para este usuario.' });
        }

        const [result] = await db.query(
            'INSERT INTO grupo_familiar (usuario_id, nombre) VALUES (?, ?)',
            [usuarioId, nombre.trim()]
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: result.insertId, nombre: nombre.trim() } });

    } catch (err) {
        console.error('crearGrupo=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function obtenerGrupo(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const [rows] = await db.query(
            'SELECT id, nombre, created_at FROM grupo_familiar WHERE usuario_id = ?', [usuarioId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No se encontró un grupo familiar.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows[0] });
    } catch (err) {
        console.error('obtenerGrupo=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// ──────────────────────────────────────────────
// CU4 — Integrantes
// ──────────────────────────────────────────────

async function agregarIntegrante(req, res) {
    const usuarioId = req.usuario.id;
    const { nombre, apellido, fecha_nacimiento, tipo, observaciones } = req.body;

    if (!nombre || !apellido || !fecha_nacimiento || !tipo) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre, apellido, fecha_nacimiento y tipo son obligatorios.' });
    }
    if (esFechaFutura(fecha_nacimiento)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha de nacimiento no puede ser una fecha futura.' });
    }

    try {
        const [grupo] = await db.query(
            'SELECT id FROM grupo_familiar WHERE usuario_id = ?', [usuarioId]
        );
        if (grupo.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const grupoId = grupo[0].id;
        const [result] = await db.query(
            'INSERT INTO integrante (grupo_id, nombre, apellido, fecha_nacimiento, tipo, observaciones) VALUES (?, ?, ?, ?, ?, ?)',
            [grupoId, nombre.trim(), apellido.trim(), fecha_nacimiento, tipo, observaciones || null]
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: result.insertId, nombre, apellido, fecha_nacimiento, tipo } });

    } catch (err) {
        console.error('agregarIntegrante=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function listarIntegrantes(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const [rows] = await db.query(
            `SELECT i.id, i.nombre, i.apellido, i.fecha_nacimiento, i.tipo, i.observaciones
             FROM integrante i
             JOIN grupo_familiar g ON g.id = i.grupo_id
             WHERE g.usuario_id = ?
             ORDER BY i.nombre`, [usuarioId]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows });
    } catch (err) {
        console.error('listarIntegrantes=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function editarIntegrante(req, res) {
    const usuarioId = req.usuario.id;
    const integranteId = req.params.id;
    const { nombre, apellido, fecha_nacimiento, tipo, observaciones } = req.body;

    if (!nombre || !apellido || !fecha_nacimiento || !tipo) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre, apellido, fecha_nacimiento y tipo son obligatorios.' });
    }
    if (esFechaFutura(fecha_nacimiento)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha de nacimiento no puede ser una fecha futura.' });
    }

    try {
        const [grupo] = await db.query(
            'SELECT id FROM grupo_familiar WHERE usuario_id = ?', [usuarioId]
        );
        if (grupo.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const grupoId = grupo[0].id;
        const [result] = await db.query(
            'UPDATE integrante SET nombre = ?, apellido = ?, fecha_nacimiento = ?, tipo = ?, observaciones = ? WHERE id = ? AND grupo_id = ?',
            [nombre.trim(), apellido.trim(), fecha_nacimiento, tipo, observaciones || null, integranteId, grupoId]
        );
        // affectedRows === 0 cubre tanto "no existe" como "existe pero es de
        // otro grupo" — mismo id, no filtra cuál de los dos casos fue.
        if (result.affectedRows === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante no encontrado.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(integranteId), nombre, apellido, fecha_nacimiento, tipo, observaciones: observaciones || null } });

    } catch (err) {
        console.error('editarIntegrante=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarIntegrante(req, res) {
    const usuarioId = req.usuario.id;
    const integranteId = req.params.id;

    try {
        const [grupo] = await db.query(
            'SELECT id FROM grupo_familiar WHERE usuario_id = ?', [usuarioId]
        );
        if (grupo.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const grupoId = grupo[0].id;
        // ON DELETE CASCADE en vacuna/tratamiento/historial (ver 01_schema.sql)
        // se encarga de los registros de salud del integrante — no hace falta
        // borrarlos a mano acá.
        const [result] = await db.query(
            'DELETE FROM integrante WHERE id = ? AND grupo_id = ?', [integranteId, grupoId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante no encontrado.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Integrante eliminado.' });

    } catch (err) {
        console.error('eliminarIntegrante=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// ──────────────────────────────────────────────
// CU5 — Mascotas
// ──────────────────────────────────────────────

async function agregarMascota(req, res) {
    const usuarioId = req.usuario.id;
    const { nombre, especie, raza, fecha_nacimiento } = req.body;

    if (!nombre || !especie) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre y especie son obligatorios.' });
    }
    if (fecha_nacimiento && esFechaFutura(fecha_nacimiento)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha de nacimiento no puede ser una fecha futura.' });
    }

    try {
        const [grupo] = await db.query(
            'SELECT id FROM grupo_familiar WHERE usuario_id = ?', [usuarioId]
        );
        if (grupo.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const grupoId = grupo[0].id;
        const [result] = await db.query(
            'INSERT INTO mascota (grupo_id, nombre, especie, raza, fecha_nacimiento) VALUES (?, ?, ?, ?, ?)',
            [grupoId, nombre.trim(), especie.trim(), raza ? raza.trim() : null, fecha_nacimiento || null]
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: result.insertId, nombre, especie, raza: raza || null, fecha_nacimiento: fecha_nacimiento || null } });

    } catch (err) {
        console.error('agregarMascota=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function listarMascotas(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const [rows] = await db.query(
            `SELECT m.id, m.nombre, m.especie, m.raza, m.fecha_nacimiento
             FROM mascota m
             JOIN grupo_familiar g ON g.id = m.grupo_id
             WHERE g.usuario_id = ?
             ORDER BY m.nombre`, [usuarioId]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows });
    } catch (err) {
        console.error('listarMascotas=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function editarMascota(req, res) {
    const usuarioId = req.usuario.id;
    const mascotaId = req.params.id;
    const { nombre, especie, raza, fecha_nacimiento } = req.body;

    if (!nombre || !especie) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre y especie son obligatorios.' });
    }
    if (fecha_nacimiento && esFechaFutura(fecha_nacimiento)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha de nacimiento no puede ser una fecha futura.' });
    }

    try {
        const [grupo] = await db.query(
            'SELECT id FROM grupo_familiar WHERE usuario_id = ?', [usuarioId]
        );
        if (grupo.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const grupoId = grupo[0].id;
        const [result] = await db.query(
            'UPDATE mascota SET nombre = ?, especie = ?, raza = ?, fecha_nacimiento = ? WHERE id = ? AND grupo_id = ?',
            [nombre.trim(), especie.trim(), raza ? raza.trim() : null, fecha_nacimiento || null, mascotaId, grupoId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Mascota no encontrada.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(mascotaId), nombre, especie, raza: raza || null, fecha_nacimiento: fecha_nacimiento || null } });

    } catch (err) {
        console.error('editarMascota=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarMascota(req, res) {
    const usuarioId = req.usuario.id;
    const mascotaId = req.params.id;

    try {
        const [grupo] = await db.query(
            'SELECT id FROM grupo_familiar WHERE usuario_id = ?', [usuarioId]
        );
        if (grupo.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const grupoId = grupo[0].id;
        const [result] = await db.query(
            'DELETE FROM mascota WHERE id = ? AND grupo_id = ?', [mascotaId, grupoId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Mascota no encontrada.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Mascota eliminada.' });

    } catch (err) {
        console.error('eliminarMascota=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = {
    crearGrupo, obtenerGrupo,
    agregarIntegrante, listarIntegrantes, editarIntegrante, eliminarIntegrante,
    agregarMascota, listarMascotas, editarMascota, eliminarMascota
};
