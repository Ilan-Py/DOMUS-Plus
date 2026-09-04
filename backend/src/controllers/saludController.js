//Codigo por ILAN PITASHNY
//1 — Controlador de salud: vacunas y tratamientos (CU6, CU7, CU10)
const db = require('../config/db');

//2 — Valida que proxima_dosis > fecha_aplicacion (CU7)
function validarFechasVacuna(fecha_aplicacion, proxima_dosis) {
    if (!proxima_dosis) return true;
    return new Date(proxima_dosis) > new Date(fecha_aplicacion);
}

// ──────────────────────────────────────────────
// CU7 — Vacunas
// ──────────────────────────────────────────────

async function registrarVacuna(req, res) {
    const { integrante_id, mascota_id, nombre, fecha_aplicacion, proxima_dosis, notas } = req.body;

    if (!nombre || !fecha_aplicacion) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre y fecha_aplicacion son obligatorios.' });
    }
    if (!integrante_id && !mascota_id) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Debe indicar integrante_id o mascota_id.' });
    }
    if (integrante_id && mascota_id) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Solo puede indicarse integrante_id o mascota_id, no ambos.' });
    }
    if (!validarFechasVacuna(fecha_aplicacion, proxima_dosis)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha de próxima dosis debe ser posterior a la fecha de aplicación.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO vacuna (integrante_id, mascota_id, nombre, fecha_aplicacion, proxima_dosis, notas) VALUES (?, ?, ?, ?, ?, ?)',
            [integrante_id || null, mascota_id || null, nombre.trim(), fecha_aplicacion, proxima_dosis || null, notas || null]
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: result.insertId, nombre, fecha_aplicacion, proxima_dosis: proxima_dosis || null } });
    } catch (err) {
        console.error('registrarVacuna=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function listarVacunas(req, res) {
    const { integrante_id, mascota_id } = req.query;

    if (!integrante_id && !mascota_id) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Debe indicar integrante_id o mascota_id como query param.' });
    }

    try {
        const campo = integrante_id ? 'integrante_id' : 'mascota_id';
        const valor = integrante_id || mascota_id;
        const [rows] = await db.query(
            `SELECT id, nombre, fecha_aplicacion, proxima_dosis, notas FROM vacuna WHERE ${campo} = ? ORDER BY fecha_aplicacion DESC`,
            [valor]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows });
    } catch (err) {
        console.error('listarVacunas=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// vacuna/tratamiento no llevan grupo_id propio (a diferencia de
// integrante/mascota) — el dueño real se resuelve subiendo por
// integrante_id O mascota_id (exactamente uno está poblado, el otro es
// NULL) hasta grupo_familiar. LEFT JOIN en los dos y COALESCE del grupo_id
// es lo que permite un solo query que cubre ambos casos sin repetir la
// rama. A diferencia de registrarVacuna/listarVacunas/etc (IDOR conocido y
// documentado, fuera de alcance acá), estos endpoints nuevos sí verifican
// pertenencia antes de leer/escribir.
async function verificarPertenenciaVacuna(vacunaId, usuarioId) {
    const [rows] = await db.query(
        `SELECT v.id FROM vacuna v
         LEFT JOIN integrante i ON v.integrante_id = i.id
         LEFT JOIN mascota m ON v.mascota_id = m.id
         LEFT JOIN grupo_familiar g ON g.id = COALESCE(i.grupo_id, m.grupo_id)
         WHERE v.id = ? AND g.usuario_id = ?`,
        [vacunaId, usuarioId]
    );
    return rows.length > 0;
}

async function editarVacuna(req, res) {
    const usuarioId = req.usuario.id;
    const vacunaId = req.params.id;
    const { nombre, fecha_aplicacion, proxima_dosis, notas } = req.body;

    if (!nombre || !fecha_aplicacion) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre y fecha_aplicacion son obligatorios.' });
    }
    if (!validarFechasVacuna(fecha_aplicacion, proxima_dosis)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha de próxima dosis debe ser posterior a la fecha de aplicación.' });
    }

    try {
        const esDelUsuario = await verificarPertenenciaVacuna(vacunaId, usuarioId);
        if (!esDelUsuario) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Vacuna no encontrada.' });
        }

        // integrante_id/mascota_id no se tocan acá — el dueño no cambia en una edición.
        await db.query(
            'UPDATE vacuna SET nombre = ?, fecha_aplicacion = ?, proxima_dosis = ?, notas = ? WHERE id = ?',
            [nombre.trim(), fecha_aplicacion, proxima_dosis || null, notas || null, vacunaId]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(vacunaId), nombre, fecha_aplicacion, proxima_dosis: proxima_dosis || null, notas: notas || null } });

    } catch (err) {
        console.error('editarVacuna=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarVacuna(req, res) {
    const usuarioId = req.usuario.id;
    const vacunaId = req.params.id;

    try {
        const esDelUsuario = await verificarPertenenciaVacuna(vacunaId, usuarioId);
        if (!esDelUsuario) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Vacuna no encontrada.' });
        }

        await db.query('DELETE FROM vacuna WHERE id = ?', [vacunaId]);
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(vacunaId) } });

    } catch (err) {
        console.error('eliminarVacuna=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// ──────────────────────────────────────────────
// CU6 — Tratamientos
// ──────────────────────────────────────────────

async function registrarTratamiento(req, res) {
    const { integrante_id, mascota_id, descripcion, medicacion, fecha_inicio, fecha_fin } = req.body;

    if (!descripcion || !medicacion || !fecha_inicio) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'descripcion, medicacion y fecha_inicio son obligatorios.' });
    }
    if (!integrante_id && !mascota_id) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Debe indicar integrante_id o mascota_id.' });
    }
    if (integrante_id && mascota_id) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Solo puede indicarse integrante_id o mascota_id, no ambos.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO tratamiento (integrante_id, mascota_id, descripcion, medicacion, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?, ?)',
            [integrante_id || null, mascota_id || null, descripcion.trim(), medicacion.trim(), fecha_inicio, fecha_fin || null]
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: result.insertId, descripcion, medicacion, fecha_inicio } });
    } catch (err) {
        console.error('registrarTratamiento=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function listarTratamientos(req, res) {
    const { integrante_id, mascota_id } = req.query;

    if (!integrante_id && !mascota_id) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Debe indicar integrante_id o mascota_id como query param.' });
    }

    try {
        const campo = integrante_id ? 'integrante_id' : 'mascota_id';
        const valor = integrante_id || mascota_id;
        const [rows] = await db.query(
            `SELECT id, descripcion, medicacion, fecha_inicio, fecha_fin FROM tratamiento WHERE ${campo} = ? ORDER BY fecha_inicio DESC`,
            [valor]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows });
    } catch (err) {
        console.error('listarTratamientos=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// ──────────────────────────────────────────────
// CU10 — Historial
// ──────────────────────────────────────────────

async function consultarHistorial(req, res) {
    const { integrante_id, mascota_id } = req.query;

    if (!integrante_id && !mascota_id) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Debe indicar integrante_id o mascota_id.' });
    }

    try {
        const campo = integrante_id ? 'integrante_id' : 'mascota_id';
        const valor = integrante_id || mascota_id;
        const [rows] = await db.query(
            `SELECT id, evento, fecha, descripcion FROM historial WHERE ${campo} = ? ORDER BY fecha DESC`,
            [valor]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows });
    } catch (err) {
        console.error('consultarHistorial=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function verificarPertenenciaTratamiento(tratamientoId, usuarioId) {
    const [rows] = await db.query(
        `SELECT t.id FROM tratamiento t
         LEFT JOIN integrante i ON t.integrante_id = i.id
         LEFT JOIN mascota m ON t.mascota_id = m.id
         LEFT JOIN grupo_familiar g ON g.id = COALESCE(i.grupo_id, m.grupo_id)
         WHERE t.id = ? AND g.usuario_id = ?`,
        [tratamientoId, usuarioId]
    );
    return rows.length > 0;
}

async function editarTratamiento(req, res) {
    const usuarioId = req.usuario.id;
    const tratamientoId = req.params.id;
    const { descripcion, medicacion, fecha_inicio, fecha_fin } = req.body;

    if (!descripcion || !medicacion || !fecha_inicio) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'descripcion, medicacion y fecha_inicio son obligatorios.' });
    }

    try {
        const esDelUsuario = await verificarPertenenciaTratamiento(tratamientoId, usuarioId);
        if (!esDelUsuario) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Tratamiento no encontrado.' });
        }

        // integrante_id/mascota_id no se tocan acá — el dueño no cambia en una edición.
        await db.query(
            'UPDATE tratamiento SET descripcion = ?, medicacion = ?, fecha_inicio = ?, fecha_fin = ? WHERE id = ?',
            [descripcion.trim(), medicacion.trim(), fecha_inicio, fecha_fin || null, tratamientoId]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(tratamientoId), descripcion, medicacion, fecha_inicio, fecha_fin: fecha_fin || null } });

    } catch (err) {
        console.error('editarTratamiento=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarTratamiento(req, res) {
    const usuarioId = req.usuario.id;
    const tratamientoId = req.params.id;

    try {
        const esDelUsuario = await verificarPertenenciaTratamiento(tratamientoId, usuarioId);
        if (!esDelUsuario) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Tratamiento no encontrado.' });
        }

        await db.query('DELETE FROM tratamiento WHERE id = ?', [tratamientoId]);
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(tratamientoId) } });

    } catch (err) {
        console.error('eliminarTratamiento=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = {
    registrarVacuna, listarVacunas, editarVacuna, eliminarVacuna,
    registrarTratamiento, listarTratamientos, editarTratamiento, eliminarTratamiento,
    consultarHistorial
};
