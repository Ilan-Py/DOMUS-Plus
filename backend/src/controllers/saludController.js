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
        const result = await db.query(
            'INSERT INTO vacuna (integrante_id, mascota_id, nombre, fecha_aplicacion, proxima_dosis, notas) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [integrante_id || null, mascota_id || null, nombre.trim(), fecha_aplicacion, proxima_dosis || null, notas || null]
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: result.rows[0].id, nombre, fecha_aplicacion, proxima_dosis: proxima_dosis || null } });
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
        const { rows } = await db.query(
            `SELECT id, nombre, fecha_aplicacion, proxima_dosis, notas FROM vacuna WHERE ${campo} = $1 ORDER BY fecha_aplicacion DESC`,
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
// NULL) hasta el grupo, vía grupo_miembro (Fase 3 — antes era un JOIN
// directo contra grupo_familiar.usuario_id, que ya no existe). LEFT JOIN en
// integrante/mascota y COALESCE del grupo_id es lo que permite un solo
// query que cubre ambos casos sin repetir la rama. A diferencia de
// registrarVacuna/listarVacunas/etc (IDOR conocido y documentado, fuera de
// alcance acá — ver nota en el README de la feature de grupos compartidos),
// estos endpoints sí verifican pertenencia antes de leer/escribir.
async function verificarPertenenciaVacuna(vacunaId, usuarioId) {
    const { rows } = await db.query(
        `SELECT v.id FROM vacuna v
         LEFT JOIN integrante i ON v.integrante_id = i.id
         LEFT JOIN mascota m ON v.mascota_id = m.id
         JOIN grupo_miembro gm ON gm.grupo_id = COALESCE(i.grupo_id, m.grupo_id)
         WHERE v.id = $1 AND gm.usuario_id = $2`,
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
            'UPDATE vacuna SET nombre = $1, fecha_aplicacion = $2, proxima_dosis = $3, notas = $4 WHERE id = $5',
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

        await db.query('DELETE FROM vacuna WHERE id = $1', [vacunaId]);
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
        const result = await db.query(
            'INSERT INTO tratamiento (integrante_id, mascota_id, descripcion, medicacion, fecha_inicio, fecha_fin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [integrante_id || null, mascota_id || null, descripcion.trim(), medicacion.trim(), fecha_inicio, fecha_fin || null]
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: result.rows[0].id, descripcion, medicacion, fecha_inicio } });
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
        const { rows } = await db.query(
            `SELECT id, descripcion, medicacion, fecha_inicio, fecha_fin FROM tratamiento WHERE ${campo} = $1 ORDER BY fecha_inicio DESC`,
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
        const { rows } = await db.query(
            `SELECT id, evento, fecha, descripcion FROM historial WHERE ${campo} = $1 ORDER BY fecha DESC`,
            [valor]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows });
    } catch (err) {
        console.error('consultarHistorial=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function verificarPertenenciaTratamiento(tratamientoId, usuarioId) {
    const { rows } = await db.query(
        `SELECT t.id FROM tratamiento t
         LEFT JOIN integrante i ON t.integrante_id = i.id
         LEFT JOIN mascota m ON t.mascota_id = m.id
         JOIN grupo_miembro gm ON gm.grupo_id = COALESCE(i.grupo_id, m.grupo_id)
         WHERE t.id = $1 AND gm.usuario_id = $2`,
        [tratamientoId, usuarioId]
    );
    return rows.length > 0;
}

// Mismo patrón exacto que verificarPertenenciaVacuna/Tratamiento — historial
// también cuelga de integrante O mascota, nunca de un grupo directo.
// Agregado para adjuntoController.js (Fase 3, feature de adjuntos), que
// reusa las tres en vez de rearmar el JOIN una cuarta vez.
async function verificarPertenenciaHistorial(historialId, usuarioId) {
    const { rows } = await db.query(
        `SELECT h.id FROM historial h
         LEFT JOIN integrante i ON h.integrante_id = i.id
         LEFT JOIN mascota m ON h.mascota_id = m.id
         JOIN grupo_miembro gm ON gm.grupo_id = COALESCE(i.grupo_id, m.grupo_id)
         WHERE h.id = $1 AND gm.usuario_id = $2`,
        [historialId, usuarioId]
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
            'UPDATE tratamiento SET descripcion = $1, medicacion = $2, fecha_inicio = $3, fecha_fin = $4 WHERE id = $5',
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

        await db.query('DELETE FROM tratamiento WHERE id = $1', [tratamientoId]);
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(tratamientoId) } });

    } catch (err) {
        console.error('eliminarTratamiento=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = {
    registrarVacuna, listarVacunas, editarVacuna, eliminarVacuna,
    registrarTratamiento, listarTratamientos, editarTratamiento, eliminarTratamiento,
    consultarHistorial,
    // Exportadas para adjuntoController.js — mismo criterio de pertenencia,
    // no se repite el JOIN.
    verificarPertenenciaVacuna, verificarPertenenciaTratamiento, verificarPertenenciaHistorial
};
