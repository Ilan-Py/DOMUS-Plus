//Codigo por ILAN PITASHNY
//1 — Controlador de grupo familiar, integrantes y mascotas (CU3, CU4, CU5)
const db = require('../config/db');
const { resolverGrupoId, resolverMembresia } = require('../utils/grupo');

//2 — Validacion: fecha no puede ser futura (CU4, CU5)
function esFechaFutura(fechaStr) {
    const fecha = new Date(fechaStr);
    const hoy   = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha > hoy;
}

// Charset del código de invitación: mayúsculas + dígitos sin 0/O/1/I/L —
// se transcribe a mano desde WhatsApp/voz, y esos pares son los que más se
// confunden. 7 caracteres (32^7 ≈ 34 mil millones de combinaciones) es de
// sobra para evitar colisiones sin ser tedioso de tipear.
const CODIGO_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODIGO_LENGTH = 7;
const MAX_INTENTOS_CODIGO = 5;

function generarCodigo() {
    let codigo = '';
    for (let i = 0; i < CODIGO_LENGTH; i++) {
        codigo += CODIGO_CHARSET[Math.floor(Math.random() * CODIGO_CHARSET.length)];
    }
    return codigo;
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
        const membresia = await resolverMembresia(usuarioId);
        if (membresia) {
            return res.status(409).json({ codigo: 409, estado: 'error', datos: 'Ya pertenecés a un grupo familiar.' });
        }

        // Transacción: un grupo sin ningún miembro (fila en grupo_familiar
        // sin su correspondiente 'dueño' en grupo_miembro) sería un estado
        // inconsistente — o se crean ambas filas, o ninguna. pg no tiene
        // beginTransaction()/commit()/rollback() como mysql2 — son comandos
        // SQL literales sobre un client sacado del pool a mano.
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                'INSERT INTO grupo_familiar (nombre) VALUES ($1) RETURNING id',
                [nombre.trim()]
            );
            const grupoId = result.rows[0].id;
            await client.query(
                'INSERT INTO grupo_miembro (grupo_id, usuario_id, rol) VALUES ($1, $2, $3)',
                [grupoId, usuarioId, 'dueño']
            );
            await client.query('COMMIT');
            return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: grupoId, nombre: nombre.trim() } });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('crearGrupo=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function obtenerGrupo(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const { rows } = await db.query(
            `SELECT g.id, g.nombre, g.created_at
             FROM grupo_familiar g
             JOIN grupo_miembro gm ON gm.grupo_id = g.id
             WHERE gm.usuario_id = $1`, [usuarioId]
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

// Owner-only, mismo patrón de resolverMembresia + chequeo de rol que
// generarInvitacion/eliminarMiembro/eliminarGrupo más abajo.
async function renombrarGrupo(req, res) {
    const usuarioId = req.usuario.id;
    const { nombre } = req.body;

    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'El nombre del grupo es obligatorio.' });
    }

    try {
        const membresia = await resolverMembresia(usuarioId);
        if (!membresia) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No pertenecés a ningún grupo familiar.' });
        }
        if (membresia.rol !== 'dueño') {
            return res.status(403).json({ codigo: 403, estado: 'error', datos: 'Sólo el dueño del grupo puede renombrarlo.' });
        }

        await db.query('UPDATE grupo_familiar SET nombre = $1 WHERE id = $2', [nombre.trim(), membresia.grupo_id]);
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: membresia.grupo_id, nombre: nombre.trim() } });

    } catch (err) {
        console.error('renombrarGrupo=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// ──────────────────────────────────────────────
// CU3b — Grupo compartido: invitación y membresía
// ──────────────────────────────────────────────

async function generarInvitacion(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const membresia = await resolverMembresia(usuarioId);
        if (!membresia) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No pertenecés a ningún grupo familiar.' });
        }
        if (membresia.rol !== 'dueño') {
            return res.status(403).json({ codigo: 403, estado: 'error', datos: 'Sólo el dueño del grupo puede generar un código de invitación.' });
        }

        // Regenerar sobreescribe el código anterior (uq_codigo_invitacion lo
        // invalida automáticamente — deja de ser válido apenas se pisa).
        for (let intento = 0; intento < MAX_INTENTOS_CODIGO; intento++) {
            const codigoCandidato = generarCodigo();
            try {
                await db.query(
                    'UPDATE grupo_familiar SET codigo_invitacion = $1 WHERE id = $2',
                    [codigoCandidato, membresia.grupo_id]
                );
                return res.status(200).json({ codigo: 200, estado: 'ok', datos: { codigo_invitacion: codigoCandidato } });
            } catch (err) {
                // '23505' = unique_violation en Postgres (equivalente al
                // ER_DUP_ENTRY de MySQL) — código SQLSTATE, no un string
                // simbólico como en mysql2.
                if (err.code !== '23505') throw err;
                // Colisión de código (extremadamente improbable) — reintentar.
            }
        }
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'No se pudo generar un código único. Intentá nuevamente.' });

    } catch (err) {
        console.error('generarInvitacion=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function unirseGrupo(req, res) {
    const usuarioId = req.usuario.id;
    const { codigo } = req.body;

    if (!codigo || !codigo.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'El código de invitación es obligatorio.' });
    }

    try {
        const membresiaActual = await resolverMembresia(usuarioId);
        if (membresiaActual) {
            return res.status(409).json({ codigo: 409, estado: 'error', datos: 'Ya pertenecés a un grupo familiar. Salí del actual antes de unirte a otro.' });
        }

        const { rows: grupos } = await db.query(
            'SELECT id FROM grupo_familiar WHERE codigo_invitacion = $1',
            [codigo.trim().toUpperCase()]
        );
        // 404 genérico, sin distinguir "no existe" de "existe pero ya no es
        // válido" (regenerado) — no hay nada más específico que filtrar acá.
        if (grupos.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Código de invitación inválido.' });
        }

        await db.query(
            'INSERT INTO grupo_miembro (grupo_id, usuario_id, rol) VALUES ($1, $2, $3)',
            [grupos[0].id, usuarioId, 'miembro']
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: 'Te uniste al grupo familiar.' });

    } catch (err) {
        console.error('unirseGrupo=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function listarMiembros(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No pertenecés a ningún grupo familiar.' });
        }
        const { rows } = await db.query(
            `SELECT u.id AS usuario_id, u.nombre, u.apellido, gm.rol, gm.joined_at
             FROM grupo_miembro gm
             JOIN usuario u ON u.id = gm.usuario_id
             WHERE gm.grupo_id = $1
             ORDER BY (gm.rol = 'dueño') DESC, gm.joined_at ASC`,
            [grupoId]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows });
    } catch (err) {
        console.error('listarMiembros=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarMiembro(req, res) {
    const usuarioId = req.usuario.id;
    const targetId = Number(req.params.usuarioId);

    if (targetId === usuarioId) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'No podés eliminarte a vos mismo de esta forma — usá "Salir del grupo".' });
    }

    try {
        const membresia = await resolverMembresia(usuarioId);
        if (!membresia) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No pertenecés a ningún grupo familiar.' });
        }
        if (membresia.rol !== 'dueño') {
            return res.status(403).json({ codigo: 403, estado: 'error', datos: 'Sólo el dueño del grupo puede eliminar miembros.' });
        }

        const result = await db.query(
            'DELETE FROM grupo_miembro WHERE usuario_id = $1 AND grupo_id = $2',
            [targetId, membresia.grupo_id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Ese usuario no pertenece a tu grupo familiar.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Miembro eliminado.' });

    } catch (err) {
        console.error('eliminarMiembro=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function salirGrupo(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const membresia = await resolverMembresia(usuarioId);
        if (!membresia) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No pertenecés a ningún grupo familiar.' });
        }
        // Transferir propiedad no está implementado en esta pasada — el
        // dueño tiene que eliminar el grupo entero (DELETE /grupo) si quiere
        // dejar de administrarlo.
        if (membresia.rol === 'dueño') {
            return res.status(400).json({ codigo: 400, estado: 'error', datos: 'El dueño no puede salir del grupo. Por ahora sólo podés eliminar el grupo completo (transferir la propiedad no está soportado todavía).' });
        }

        await db.query('DELETE FROM grupo_miembro WHERE usuario_id = $1', [usuarioId]);
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Saliste del grupo familiar.' });

    } catch (err) {
        console.error('salirGrupo=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarGrupo(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const membresia = await resolverMembresia(usuarioId);
        if (!membresia) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No pertenecés a ningún grupo familiar.' });
        }
        if (membresia.rol !== 'dueño') {
            return res.status(403).json({ codigo: 403, estado: 'error', datos: 'Sólo el dueño puede eliminar el grupo familiar.' });
        }

        // ON DELETE CASCADE en grupo_miembro/integrante/mascota/recordatorio
        // (Scripts/01_schema.sql + 03_grupo_compartido.sql) limpia todo lo que
        // cuelga del grupo — vacuna/tratamiento/historial cascadean a su vez
        // desde integrante/mascota. No hace falta borrar nada a mano acá
        // (verificado en vivo contra un contenedor de prueba).
        await db.query('DELETE FROM grupo_familiar WHERE id = $1', [membresia.grupo_id]);
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Grupo familiar eliminado.' });

    } catch (err) {
        console.error('eliminarGrupo=', err.message);
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
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const result = await db.query(
            'INSERT INTO integrante (grupo_id, nombre, apellido, fecha_nacimiento, tipo, observaciones) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [grupoId, nombre.trim(), apellido.trim(), fecha_nacimiento, tipo, observaciones || null]
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: result.rows[0].id, nombre, apellido, fecha_nacimiento, tipo } });

    } catch (err) {
        console.error('agregarIntegrante=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function listarIntegrantes(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const { rows } = await db.query(
            `SELECT i.id, i.nombre, i.apellido, i.fecha_nacimiento, i.tipo, i.observaciones,
                    i.alergias, i.tipo_sangre, i.notas_emergencia
             FROM integrante i
             JOIN grupo_miembro gm ON gm.grupo_id = i.grupo_id
             WHERE gm.usuario_id = $1
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
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const result = await db.query(
            'UPDATE integrante SET nombre = $1, apellido = $2, fecha_nacimiento = $3, tipo = $4, observaciones = $5 WHERE id = $6 AND grupo_id = $7',
            [nombre.trim(), apellido.trim(), fecha_nacimiento, tipo, observaciones || null, integranteId, grupoId]
        );
        // rowCount === 0 cubre tanto "no existe" como "existe pero es de
        // otro grupo" — mismo id, no filtra cuál de los dos casos fue.
        if (result.rowCount === 0) {
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
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        // ON DELETE CASCADE en vacuna/tratamiento/historial (ver 01_schema.sql)
        // se encarga de los registros de salud del integrante — no hace falta
        // borrarlos a mano acá.
        const result = await db.query(
            'DELETE FROM integrante WHERE id = $1 AND grupo_id = $2', [integranteId, grupoId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante no encontrado.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Integrante eliminado.' });

    } catch (err) {
        console.error('eliminarIntegrante=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// Endpoint separado del PATCH de perfil completo (editarIntegrante) a
// propósito — mantiene "editar nombre/fecha" y "editar ficha de emergencia"
// como dos acciones enfocadas en vez de un único formulario gigante. Mismo
// patrón de pertenencia (resolverGrupoId + WHERE ... AND grupo_id = ?) que
// editarIntegrante, no uno nuevo.
async function editarEmergenciaIntegrante(req, res) {
    const usuarioId = req.usuario.id;
    const integranteId = req.params.id;
    const { alergias, tipo_sangre, notas_emergencia } = req.body;

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const result = await db.query(
            'UPDATE integrante SET alergias = $1, tipo_sangre = $2, notas_emergencia = $3 WHERE id = $4 AND grupo_id = $5',
            [alergias || null, tipo_sangre || null, notas_emergencia || null, integranteId, grupoId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante no encontrado.' });
        }
        return res.status(200).json({
            codigo: 200,
            estado: 'ok',
            datos: {
                id: Number(integranteId),
                alergias: alergias || null,
                tipo_sangre: tipo_sangre || null,
                notas_emergencia: notas_emergencia || null,
            },
        });

    } catch (err) {
        console.error('editarEmergenciaIntegrante=', err.message);
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
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const result = await db.query(
            'INSERT INTO mascota (grupo_id, nombre, especie, raza, fecha_nacimiento) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [grupoId, nombre.trim(), especie.trim(), raza ? raza.trim() : null, fecha_nacimiento || null]
        );
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: result.rows[0].id, nombre, especie, raza: raza || null, fecha_nacimiento: fecha_nacimiento || null } });

    } catch (err) {
        console.error('agregarMascota=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function listarMascotas(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const { rows } = await db.query(
            `SELECT m.id, m.nombre, m.especie, m.raza, m.fecha_nacimiento
             FROM mascota m
             JOIN grupo_miembro gm ON gm.grupo_id = m.grupo_id
             WHERE gm.usuario_id = $1
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
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const result = await db.query(
            'UPDATE mascota SET nombre = $1, especie = $2, raza = $3, fecha_nacimiento = $4 WHERE id = $5 AND grupo_id = $6',
            [nombre.trim(), especie.trim(), raza ? raza.trim() : null, fecha_nacimiento || null, mascotaId, grupoId]
        );
        if (result.rowCount === 0) {
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
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const result = await db.query(
            'DELETE FROM mascota WHERE id = $1 AND grupo_id = $2', [mascotaId, grupoId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Mascota no encontrada.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Mascota eliminada.' });

    } catch (err) {
        console.error('eliminarMascota=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = {
    crearGrupo, obtenerGrupo, renombrarGrupo,
    generarInvitacion, unirseGrupo, listarMiembros, eliminarMiembro, salirGrupo, eliminarGrupo,
    agregarIntegrante, listarIntegrantes, editarIntegrante, eliminarIntegrante,
    editarEmergenciaIntegrante,
    agregarMascota, listarMascotas, editarMascota, eliminarMascota
};
