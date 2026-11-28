// Controlador de recordatorios (CU8, CU9)
// Recordatorio es compartido por grupo — grupo_id es el límite de pertenencia,
// creado_por registra quién lo creó pero no filtra.
const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');
const { resolverGrupoId, verificarPertenenciaDirecta } = require('../utils/grupo');
const { verificarPertenenciaVacuna, verificarPertenenciaTratamiento } = require('./saludController');
const { validarCampos, hoyMasAnios, instanteDe } = require('../utils/validacion');

// Tipo, formato y largo de cada campo (ERR-011). Los obligatorios se chequean en cada función.
const REGLAS_RECORDATORIO = {
    vacuna_id:      { tipo: 'id', etiqueta: 'vacuna_id' },
    tratamiento_id: { tipo: 'id', etiqueta: 'tratamiento_id' },
    integrante_id:  { tipo: 'id', etiqueta: 'integrante_id' },
    mascota_id:     { tipo: 'id', etiqueta: 'mascota_id' },
    fecha_hora:     {
        tipo: 'fechaHora', etiqueta: 'fecha y hora', hasta: hoyMasAnios(5),
        mensajeHasta: 'El recordatorio no puede ser a más de 5 años.'
    },
    descripcion:    { tipo: 'texto', max: 255, etiqueta: 'descripción' }
};

const TIPOS_VALIDOS = ['vacuna', 'control', 'medicacion'];

// MEJ-005: recordatorios periódicos. Cada repetición se guarda como un
// recordatorio propio, así el calendario las muestra sin cambios y cada una se
// puede editar, desactivar o borrar sola. Las de una misma serie comparten serie_id.
const DIA_MS = 24 * 60 * 60 * 1000;
const VECES_POR_DEFECTO = 10;
const REGLAS_REPETICION = {
    repetir_cada_dias: { tipo: 'entero', min: 1, max: 365, etiqueta: 'repetir cada (días)' },
    repetir_veces:     { tipo: 'entero', min: 2, max: 100, etiqueta: 'cantidad de veces' }
};
const ALCANCES_BORRADO = ['este', 'siguientes'];

// "Para quién": integrante_id o mascota_id (ninguno o uno solo), y del grupo del usuario.
// Devuelve { error, status } o { integranteId, mascotaId }.
async function resolverParaQuien(body, usuarioId) {
    const { integrante_id, mascota_id } = body;
    if (integrante_id && mascota_id) {
        return { status: 400, error: 'Solo puede indicarse integrante_id o mascota_id, no ambos.' };
    }
    if (integrante_id && !(await verificarPertenenciaDirecta('integrante', integrante_id, usuarioId))) {
        return { status: 404, error: 'Integrante no encontrado.' };
    }
    if (mascota_id && !(await verificarPertenenciaDirecta('mascota', mascota_id, usuarioId))) {
        return { status: 404, error: 'Mascota no encontrada.' };
    }
    return {
        integranteId: integrante_id ? Number(integrante_id) : null,
        mascotaId:    mascota_id    ? Number(mascota_id)    : null
    };
}

async function crearRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const { vacuna_id, tratamiento_id, tipo, fecha_hora, descripcion, repetir_cada_dias, repetir_veces } = req.body;

    const errorCampos = validarCampos(req.body, { ...REGLAS_RECORDATORIO, ...REGLAS_REPETICION });
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }
    const seRepite = repetir_cada_dias !== undefined && repetir_cada_dias !== null && repetir_cada_dias !== '';
    if (!seRepite && repetir_veces !== undefined && repetir_veces !== null && repetir_veces !== '') {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Indicá cada cuántos días se repite.' });
    }

    if (!tipo || !fecha_hora) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Elegí el tipo, la fecha y la hora.' });
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}.` });
    }
    if (instanteDe(fecha_hora) <= new Date()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Elegí una hora que todavía no pasó. Para anotar una dosis que ya se dio, marcala en Hoy.' });
    }
    // Una vacuna diaria o un turno diario no tienen sentido (pasó con la serie «Si»): mínimo de días según el tipo.
    const MINIMO_DIAS = { medicacion: 1, control: 7, vacuna: 28 };
    if (seRepite && Number(repetir_cada_dias) < MINIMO_DIAS[tipo]) {
        return res.status(400).json({
            codigo: 400,
            estado: 'error',
            datos: tipo === 'vacuna' ? 'Una vacuna no se repite tan seguido: elegí 28 días o más.' : 'Un turno no se repite tan seguido: elegí 7 días o más.'
        });
    }

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Primero creá tu familia o sumate a una con un código.' });
        }

        // La vacuna/tratamiento vinculado tiene que ser de este grupo — sin esto
        // se podía colgar un recordatorio de la vacuna de otra familia.
        if (vacuna_id && !(await verificarPertenenciaVacuna(vacuna_id, usuarioId))) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Vacuna no encontrada.' });
        }
        if (tratamiento_id && !(await verificarPertenenciaTratamiento(tratamiento_id, usuarioId))) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Tratamiento no encontrado.' });
        }

        const paraQuien = await resolverParaQuien(req.body, usuarioId);
        if (paraQuien.error) {
            return res.status(paraQuien.status).json({ codigo: paraQuien.status, estado: 'error', datos: paraQuien.error });
        }

        const base = {
            grupoId,
            integranteId:  paraQuien.integranteId,
            mascotaId:     paraQuien.mascotaId,
            creadoPor:     usuarioId,
            vacunaId:      vacuna_id      ? Number(vacuna_id)      : null,
            tratamientoId: tratamiento_id ? Number(tratamiento_id) : null,
            tipo,
            descripcion:   descripcion || null
        };
        const inicio = instanteDe(fecha_hora);
        const cadaDias = seRepite ? Number(repetir_cada_dias) : null;
        const veces    = seRepite ? Number(repetir_veces || VECES_POR_DEFECTO) : 1;
        const serieId  = seRepite ? randomUUID() : null;

        // La primera repetición es la fecha elegida; cada una de las siguientes
        // va `cadaDias` días después de la anterior, a la misma hora.
        const filas = Array.from({ length: veces }, (_, i) => ({
            ...base,
            fechaHora:      new Date(inicio.getTime() + i * cadaDias * DIA_MS),
            serieId,
            repeticionDias: cadaDias
        }));
        const creados = await prisma.$transaction(
            filas.map((data) => prisma.recordatorio.create({
                data,
                select: { id: true, tipo: true, fechaHora: true, serieId: true, repeticionDias: true }
            }))
        );

        // Se devuelve el primero (como antes) más cuántos se crearon en total.
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: { ...creados[0], cantidad: creados.length } });
    } catch (err) {
        console.error('crearRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// CU9 — Todos los miembros del grupo ven los mismos recordatorios
async function listarRecordatorios(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(200).json({ codigo: 200, estado: 'ok', datos: [] });
        }

        const recordatorios = await prisma.recordatorio.findMany({
            where: { grupoId },
            orderBy: { fechaHora: 'asc' },
            select: {
                id: true, vacunaId: true, tratamientoId: true,
                tipo: true, fechaHora: true, descripcion: true,
                activo: true, creadoPor: true,
                integranteId: true, mascotaId: true,
                serieId: true, repeticionDias: true,
                estado: true, hechoA: true,
                // Sólo el nombre de quien marcó (para «Dada por Mónica a las 08:10»), nunca otros datos.
                marcadoPor: { select: { id: true, nombre: true } }
            }
        });

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: recordatorios });
    } catch (err) {
        console.error('listarRecordatorios=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// vacuna_id/tratamiento_id no se editan — el vínculo no es reasignable
async function editarRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const id = Number(req.params.id);
    const { tipo, fecha_hora, descripcion } = req.body;

    const errorCampos = validarCampos(req.body, REGLAS_RECORDATORIO);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }

    if (!tipo || !fecha_hora) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Elegí el tipo, la fecha y la hora.' });
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}.` });
    }
    if (instanteDe(fecha_hora) <= new Date()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Elegí una hora que todavía no pasó. Para anotar una dosis que ya se dio, marcala en Hoy.' });
    }

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No encontramos ese aviso. Puede que alguien lo haya eliminado.' });
        }

        const data = { tipo, fechaHora: instanteDe(fecha_hora), descripcion: descripcion || null };
        // "Para quién" sólo se toca si el pedido lo incluye (los clientes viejos no lo mandan).
        if ('integrante_id' in req.body || 'mascota_id' in req.body) {
            const paraQuien = await resolverParaQuien(req.body, usuarioId);
            if (paraQuien.error) {
                return res.status(paraQuien.status).json({ codigo: paraQuien.status, estado: 'error', datos: paraQuien.error });
            }
            data.integranteId = paraQuien.integranteId;
            data.mascotaId = paraQuien.mascotaId;
        }

        const resultado = await prisma.recordatorio.updateMany({
            where: { id, grupoId },
            data
        });
        if (resultado.count === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No encontramos ese aviso. Puede que alguien lo haya eliminado.' });
        }

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id, tipo, fecha_hora, descripcion: descripcion || null } });
    } catch (err) {
        console.error('editarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// DELETE /api/recordatorios/:id               → borra sólo ese
// DELETE /api/recordatorios/:id?alcance=siguientes → ese y los posteriores de su serie (MEJ-005)
async function eliminarRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const id = Number(req.params.id);
    const alcance = req.query.alcance || 'este';

    if (!ALCANCES_BORRADO.includes(alcance)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: `alcance debe ser uno de: ${ALCANCES_BORRADO.join(', ')}.` });
    }

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No encontramos ese aviso. Puede que alguien lo haya eliminado.' });
        }

        const recordatorio = await prisma.recordatorio.findFirst({
            where: { id, grupoId },
            select: { serieId: true, fechaHora: true }
        });
        if (!recordatorio) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No encontramos ese aviso. Puede que alguien lo haya eliminado.' });
        }

        // Sin serie (o "sólo este") se borra únicamente ese recordatorio.
        const where = alcance === 'siguientes' && recordatorio.serieId
            ? { grupoId, serieId: recordatorio.serieId, fechaHora: { gte: recordatorio.fechaHora } }
            : { id, grupoId };
        const resultado = await prisma.recordatorio.deleteMany({ where });

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id, eliminados: resultado.count } });
    } catch (err) {
        console.error('eliminarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function desactivarRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const id = Number(req.params.id);

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No encontramos ese aviso. Puede que alguien lo haya eliminado.' });
        }

        // Compatibilidad con la app anterior: «desactivar» = marcar como hecho ahora.
        const resultado = await prisma.recordatorio.updateMany({
            where: { id, grupoId },
            data: { activo: false, estado: 'hecho', hechoA: new Date(), hechoPor: usuarioId }
        });
        if (resultado.count === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No encontramos ese aviso. Puede que alguien lo haya eliminado.' });
        }

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Recordatorio desactivado.' });
    } catch (err) {
        console.error('desactivarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// PATCH /api/recordatorios/:id/marcar  { estado: 'hecho' | 'omitido', hecho_a? }
// Marca una dosis como dada o como «no se dio» (un turno: fue / no fue). `hecho_a` es cuándo pasó; si no viene,
// ahora. No puede ser futura ni de antes de que existiera el recordatorio menos un día (una dosis adelantada).
const ESTADOS_MARCA = ['hecho', 'omitido'];
const REGLAS_MARCA = { hecho_a: { tipo: 'fechaHora', etiqueta: 'hora en que pasó' } };
const MARGEN_FUTURO_MS = 5 * 60 * 1000; // relojes del celular un poco adelantados

async function marcarRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const id = Number(req.params.id);
    const { estado, hecho_a } = req.body;

    if (!ESTADOS_MARCA.includes(estado)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Elegí si se hizo o no se hizo.' });
    }
    const errorCampos = validarCampos(req.body, REGLAS_MARCA);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }
    const hechoA = hecho_a ? instanteDe(hecho_a) : new Date();
    if (hechoA.getTime() > Date.now() + MARGEN_FUTURO_MS) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La hora no puede ser después de ahora.' });
    }

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No encontramos ese aviso. Puede que alguien lo haya eliminado.' });
        }
        const recordatorio = await prisma.recordatorio.findFirst({ where: { id, grupoId }, select: { fechaHora: true } });
        if (!recordatorio) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No encontramos ese aviso. Puede que alguien lo haya eliminado.' });
        }
        if (hechoA.getTime() < recordatorio.fechaHora.getTime() - DIA_MS) {
            return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La hora no puede ser más de un día antes de lo programado.' });
        }

        await prisma.recordatorio.updateMany({
            where: { id, grupoId },
            data: { activo: false, estado, hechoA, hechoPor: usuarioId }
        });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id, estado, hecho_a: hechoA } });
    } catch (err) {
        console.error('marcarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// PATCH /api/recordatorios/:id/reactivar — «Deshacer»: vuelve a pendiente y borra la marca.
async function reactivarRecordatorio(req, res) {
    const usuarioId = req.usuario.id;
    const id = Number(req.params.id);

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No encontramos ese aviso. Puede que alguien lo haya eliminado.' });
        }
        const resultado = await prisma.recordatorio.updateMany({
            where: { id, grupoId },
            data: { activo: true, estado: 'pendiente', hechoA: null, hechoPor: null }
        });
        if (resultado.count === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No encontramos ese aviso. Puede que alguien lo haya eliminado.' });
        }
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id, estado: 'pendiente' } });
    } catch (err) {
        console.error('reactivarRecordatorio=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = {
    crearRecordatorio, listarRecordatorios, editarRecordatorio, eliminarRecordatorio, desactivarRecordatorio,
    marcarRecordatorio, reactivarRecordatorio
};
