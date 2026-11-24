// Controlador de profesionales de salud — polimórfico de 2 padres
// (integrante o mascota). Reutiliza verificarPertenenciaDirecta y
// extraerPadreUnico de utils/grupo.js.
const prisma = require('../config/prisma');
const { verificarPertenenciaDirecta, extraerPadreUnico } = require('../utils/grupo');
const { validarCampos } = require('../utils/validacion');

// Tipo y largo de cada campo (ERR-011). Los obligatorios se chequean en cada función.
// MEJ-002: especialidad — una de la lista, u "Otra" escribiendo cuál (se guarda
// lo escrito, ej. "Fonoaudiología", no la palabra "Otra"). Sigue siendo opcional.
const ESPECIALIDADES = [
    'Medicina general', 'Pediatría', 'Cardiología', 'Dermatología', 'Ginecología',
    'Traumatología', 'Oftalmología', 'Odontología', 'Psicología', 'Nutrición', 'Veterinario'
];
// Otras formas de escribir una de la lista (comparadas sin tildes ni mayúsculas)
const ALIAS_ESPECIALIDAD = { 'veterinaria': 'Veterinario', 'clinica': 'Medicina general', 'clinico': 'Medicina general' };

function sinTildes(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// "pediatria" / "PEDIATRÍA " → "Pediatría"; una especialidad escrita a mano queda
// con la primera letra en mayúscula y sin espacios de más.
function normalizarEspecialidad(valor) {
    if (typeof valor !== 'string') return valor;
    const limpia = valor.trim().replace(/\s+/g, ' ');
    if (!limpia) return limpia;
    const clave = sinTildes(limpia);
    const deLaLista = ESPECIALIDADES.find((e) => sinTildes(e) === clave) || ALIAS_ESPECIALIDAD[clave];
    return deLaLista || limpia.charAt(0).toUpperCase() + limpia.slice(1).toLowerCase();
}

function esEspecialidadSinDetalle(especialidad) {
    return typeof especialidad === 'string' && ['otra', 'otro'].includes(sinTildes(especialidad));
}

const REGLAS_PROFESIONAL = {
    nombre:       { tipo: 'texto', max: 150 },
    especialidad: { tipo: 'nombrePersona', max: 100 }, // MEJ-002: sólo letras (sin números ni símbolos)
    telefono:     { tipo: 'texto', max: 30, etiqueta: 'teléfono' },
    direccion:    { tipo: 'texto', max: 255, etiqueta: 'dirección' },
    notas:        { tipo: 'texto', max: 2000 }
};

const CAMPOS_PADRE = ['integrante', 'mascota'];

// POST /api/salud/profesionales
async function crearProfesional(req, res) {
    const usuarioId = req.usuario.id;
    const { tipoPadre, padreId, error } = extraerPadreUnico(req.body, CAMPOS_PADRE);
    if (error) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: error });
    }

    const { nombre, telefono, direccion, notas } = req.body;
    const especialidad = normalizarEspecialidad(req.body.especialidad);

    const errorCampos = validarCampos({ ...req.body, especialidad }, REGLAS_PROFESIONAL);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }
    if (esEspecialidadSinDetalle(especialidad)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Si la especialidad es "Otra", escribí cuál es (por ejemplo, Fonoaudiología).' });
    }
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre es obligatorio.' });
    }

    try {
        const pertenece = await verificarPertenenciaDirecta(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Registro no encontrado.' });
        }

        const nuevo = await prisma.profesionalSalud.create({
            data: {
                integranteId: tipoPadre === 'integrante' ? padreId : null,
                mascotaId:    tipoPadre === 'mascota'    ? padreId : null,
                nombre:       nombre.trim(),
                especialidad: especialidad || null,
                telefono:     telefono     || null,
                direccion:    direccion    || null,
                notas:        notas        || null
            },
            select: { id: true, nombre: true, especialidad: true, telefono: true, direccion: true, notas: true }
        });

        return res.status(201).json({ codigo: 201, estado: 'ok', datos: nuevo });
    } catch (err) {
        console.error('crearProfesional=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// GET /api/salud/profesionales?integrante_id=X (o ?mascota_id=X)
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

        const where = tipoPadre === 'integrante'
            ? { integranteId: padreId }
            : { mascotaId:    padreId };

        const profesionales = await prisma.profesionalSalud.findMany({
            where,
            orderBy: { nombre: 'asc' },
            select: { id: true, nombre: true, especialidad: true, telefono: true, direccion: true, notas: true }
        });

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: profesionales });
    } catch (err) {
        console.error('listarProfesionales=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// PATCH /api/salud/profesionales/:id
async function editarProfesional(req, res) {
    const usuarioId = req.usuario.id;
    const id        = Number(req.params.id);
    const { nombre, telefono, direccion, notas } = req.body;
    const especialidad = normalizarEspecialidad(req.body.especialidad);

    const errorCampos = validarCampos({ ...req.body, especialidad }, REGLAS_PROFESIONAL);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }
    if (esEspecialidadSinDetalle(especialidad)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Si la especialidad es "Otra", escribí cuál es (por ejemplo, Fonoaudiología).' });
    }

    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre es obligatorio.' });
    }

    try {
        const profesional = await prisma.profesionalSalud.findUnique({ where: { id } });
        if (!profesional) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }

        const tipoPadre = profesional.integranteId !== null ? 'integrante' : 'mascota';
        const padreId   = profesional.integranteId ?? profesional.mascotaId;

        const pertenece = await verificarPertenenciaDirecta(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }

        await prisma.profesionalSalud.update({
            where: { id },
            data: {
                nombre:       nombre.trim(),
                especialidad: especialidad || null,
                telefono:     telefono     || null,
                direccion:    direccion    || null,
                notas:        notas        || null
            }
        });

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id, nombre: nombre.trim(), especialidad: especialidad || null, telefono: telefono || null, direccion: direccion || null, notas: notas || null } });
    } catch (err) {
        console.error('editarProfesional=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// DELETE /api/salud/profesionales/:id
async function eliminarProfesional(req, res) {
    const usuarioId = req.usuario.id;
    const id        = Number(req.params.id);

    try {
        const profesional = await prisma.profesionalSalud.findUnique({ where: { id } });
        if (!profesional) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }

        const tipoPadre = profesional.integranteId !== null ? 'integrante' : 'mascota';
        const padreId   = profesional.integranteId ?? profesional.mascotaId;

        const pertenece = await verificarPertenenciaDirecta(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Profesional no encontrado.' });
        }

        await prisma.profesionalSalud.delete({ where: { id } });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id } });
    } catch (err) {
        console.error('eliminarProfesional=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { crearProfesional, listarProfesionales, editarProfesional, eliminarProfesional };
