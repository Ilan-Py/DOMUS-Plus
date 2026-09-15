//Codigo por ILAN PITASHNY
//1 — Controlador de grupo familiar, integrantes y mascotas (CU3, CU4, CU5) — migrado a Prisma
const prisma = require('../config/prisma');
const { resolverGrupoId, resolverMembresia } = require('../utils/grupo');

//2 — Validacion: fecha no puede ser futura (CU4, CU5)
function esFechaFutura(fechaStr) {
    const fecha = new Date(fechaStr);
    const hoy   = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha > hoy;
}

const CODIGO_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODIGO_LENGTH  = 7;
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

        // Prisma maneja la transacción con $transaction — equivalente al
        // BEGIN/COMMIT manual de pg. Si cualquiera de las dos operaciones
        // falla, Prisma hace rollback automático.
        const resultado = await prisma.$transaction(async (tx) => {
            const grupo = await tx.grupoFamiliar.create({
                data: { nombre: nombre.trim() }
            });
            await tx.grupoMiembro.create({
                data: { grupoId: grupo.id, usuarioId, rol: 'dueno' }
            });
            return grupo;
        });

        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { id: resultado.id, nombre: resultado.nombre } });

    } catch (err) {
        console.error('crearGrupo=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function obtenerGrupo(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const membresia = await prisma.grupoMiembro.findUnique({
            where: { usuarioId },
            include: { grupo: { select: { id: true, nombre: true, createdAt: true } } }
        });
        if (!membresia) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No se encontró un grupo familiar.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: membresia.grupo });
    } catch (err) {
        console.error('obtenerGrupo=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

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
        if (membresia.rol !== 'dueno') {
            return res.status(403).json({ codigo: 403, estado: 'error', datos: 'Sólo el dueño del grupo puede renombrarlo.' });
        }

        await prisma.grupoFamiliar.update({
            where: { id: membresia.grupo_id },
            data: { nombre: nombre.trim() }
        });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: membresia.grupo_id, nombre: nombre.trim() } });

    } catch (err) {
        console.error('renombrarGrupo=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// ──────────────────────────────────────────────
// CU3b — Grupo compartido
// ──────────────────────────────────────────────

async function generarInvitacion(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const membresia = await resolverMembresia(usuarioId);
        if (!membresia) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No pertenecés a ningún grupo familiar.' });
        }
        if (membresia.rol !== 'dueno') {
            return res.status(403).json({ codigo: 403, estado: 'error', datos: 'Sólo el dueño del grupo puede generar un código de invitación.' });
        }

        for (let intento = 0; intento < MAX_INTENTOS_CODIGO; intento++) {
            const codigoCandidato = generarCodigo();
            try {
                await prisma.grupoFamiliar.update({
                    where: { id: membresia.grupo_id },
                    data: { codigoInvitacion: codigoCandidato }
                });
                return res.status(200).json({ codigo: 200, estado: 'ok', datos: { codigo_invitacion: codigoCandidato } });
            } catch (err) {
                // P2002 = unique constraint violation en Prisma (equivalente al 23505 de pg)
                if (err.code !== 'P2002') throw err;
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

        const grupo = await prisma.grupoFamiliar.findUnique({
            where: { codigoInvitacion: codigo.trim().toUpperCase() },
            select: { id: true }
        });
        if (!grupo) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Código de invitación inválido.' });
        }

        await prisma.grupoMiembro.create({
            data: { grupoId: grupo.id, usuarioId, rol: 'miembro' }
        });
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

        const miembros = await prisma.grupoMiembro.findMany({
            where: { grupoId },
            include: { usuario: { select: { id: true, nombre: true, apellido: true } } },
            orderBy: [{ joinedAt: 'asc' }]
        });

        const datos = miembros.map((m) => ({
            usuario_id: m.usuario.id,
            nombre:     m.usuario.nombre,
            apellido:   m.usuario.apellido,
            rol:        m.rol,
            joined_at:  m.joinedAt
        }));

        return res.status(200).json({ codigo: 200, estado: 'ok', datos });
    } catch (err) {
        console.error('listarMiembros=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarMiembro(req, res) {
    const usuarioId = req.usuario.id;
    const targetId  = Number(req.params.usuarioId);

    if (targetId === usuarioId) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'No podés eliminarte a vos mismo de esta forma — usá "Salir del grupo".' });
    }

    try {
        const membresia = await resolverMembresia(usuarioId);
        if (!membresia) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No pertenecés a ningún grupo familiar.' });
        }
        if (membresia.rol !== 'dueno') {
            return res.status(403).json({ codigo: 403, estado: 'error', datos: 'Sólo el dueño del grupo puede eliminar miembros.' });
        }

        const eliminado = await prisma.grupoMiembro.deleteMany({
            where: { usuarioId: targetId, grupoId: membresia.grupo_id }
        });
        if (eliminado.count === 0) {
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
        if (membresia.rol === 'dueno') {
            return res.status(400).json({ codigo: 400, estado: 'error', datos: 'El dueño no puede salir del grupo. Por ahora sólo podés eliminar el grupo completo.' });
        }

        await prisma.grupoMiembro.delete({ where: { usuarioId } });
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
        if (membresia.rol !== 'dueno') {
            return res.status(403).json({ codigo: 403, estado: 'error', datos: 'Sólo el dueño puede eliminar el grupo familiar.' });
        }

        // onDelete: Cascade en el schema.prisma limpia todo lo que cuelga
        // del grupo — igual que el ON DELETE CASCADE del SQL original.
        await prisma.grupoFamiliar.delete({ where: { id: membresia.grupo_id } });
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

        const nuevo = await prisma.integrante.create({
            data: {
                grupoId,
                nombre:          nombre.trim(),
                apellido:        apellido.trim(),
                fechaNacimiento: new Date(fecha_nacimiento),
                tipo,
                observaciones:   observaciones || null
            },
            select: { id: true, nombre: true, apellido: true, fechaNacimiento: true, tipo: true }
        });

        return res.status(201).json({ codigo: 201, estado: 'ok', datos: nuevo });

    } catch (err) {
        console.error('agregarIntegrante=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function listarIntegrantes(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) return res.status(200).json({ codigo: 200, estado: 'ok', datos: [] });

        const integrantes = await prisma.integrante.findMany({
            where: { grupoId },
            orderBy: { nombre: 'asc' }
        });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: integrantes });
    } catch (err) {
        console.error('listarIntegrantes=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function editarIntegrante(req, res) {
    const usuarioId    = req.usuario.id;
    const integranteId = Number(req.params.id);
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

        // updateMany con where grupoId garantiza que el integrante sea del grupo del usuario.
        // count === 0 cubre tanto "no existe" como "es de otro grupo".
        const resultado = await prisma.integrante.updateMany({
            where: { id: integranteId, grupoId },
            data: {
                nombre:          nombre.trim(),
                apellido:        apellido.trim(),
                fechaNacimiento: new Date(fecha_nacimiento),
                tipo,
                observaciones:   observaciones || null
            }
        });
        if (resultado.count === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante no encontrado.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: integranteId, nombre, apellido, fecha_nacimiento, tipo, observaciones: observaciones || null } });

    } catch (err) {
        console.error('editarIntegrante=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarIntegrante(req, res) {
    const usuarioId    = req.usuario.id;
    const integranteId = Number(req.params.id);

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const resultado = await prisma.integrante.deleteMany({
            where: { id: integranteId, grupoId }
        });
        if (resultado.count === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante no encontrado.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Integrante eliminado.' });

    } catch (err) {
        console.error('eliminarIntegrante=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function editarEmergenciaIntegrante(req, res) {
    const usuarioId    = req.usuario.id;
    const integranteId = Number(req.params.id);
    const { alergias, tipo_sangre, notas_emergencia } = req.body;

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const resultado = await prisma.integrante.updateMany({
            where: { id: integranteId, grupoId },
            data: {
                alergias:        alergias        || null,
                tipoSangre:      tipo_sangre     || null,
                notasEmergencia: notas_emergencia || null
            }
        });
        if (resultado.count === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Integrante no encontrado.' });
        }
        return res.status(200).json({
            codigo: 200, estado: 'ok',
            datos: { id: integranteId, alergias: alergias || null, tipo_sangre: tipo_sangre || null, notas_emergencia: notas_emergencia || null }
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

        const nueva = await prisma.mascota.create({
            data: {
                grupoId,
                nombre:          nombre.trim(),
                especie:         especie.trim(),
                raza:            raza ? raza.trim() : null,
                fechaNacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null
            }
        });

        return res.status(201).json({ codigo: 201, estado: 'ok', datos: nueva });

    } catch (err) {
        console.error('agregarMascota=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function listarMascotas(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) return res.status(200).json({ codigo: 200, estado: 'ok', datos: [] });

        const mascotas = await prisma.mascota.findMany({
            where: { grupoId },
            orderBy: { nombre: 'asc' }
        });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: mascotas });
    } catch (err) {
        console.error('listarMascotas=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function editarMascota(req, res) {
    const usuarioId = req.usuario.id;
    const mascotaId = Number(req.params.id);
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

        const resultado = await prisma.mascota.updateMany({
            where: { id: mascotaId, grupoId },
            data: {
                nombre:          nombre.trim(),
                especie:         especie.trim(),
                raza:            raza ? raza.trim() : null,
                fechaNacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null
            }
        });
        if (resultado.count === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Mascota no encontrada.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: mascotaId, nombre, especie, raza: raza || null, fecha_nacimiento: fecha_nacimiento || null } });

    } catch (err) {
        console.error('editarMascota=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarMascota(req, res) {
    const usuarioId = req.usuario.id;
    const mascotaId = Number(req.params.id);

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Debe crear un grupo familiar primero.' });
        }

        const resultado = await prisma.mascota.deleteMany({
            where: { id: mascotaId, grupoId }
        });
        if (resultado.count === 0) {
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
    agregarIntegrante, listarIntegrantes, editarIntegrante, eliminarIntegrante, editarEmergenciaIntegrante,
    agregarMascota, listarMascotas, editarMascota, eliminarMascota
};
