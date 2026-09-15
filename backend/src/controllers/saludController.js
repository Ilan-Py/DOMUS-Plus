//Codigo por ILAN PITASHNY
//1 — Controlador de salud: vacunas y tratamientos (CU6, CU7, CU10) — migrado a Prisma
const prisma = require('../config/prisma');

//2 — Valida que proxima_dosis > fecha_aplicacion (CU7)
function validarFechasVacuna(fecha_aplicacion, proxima_dosis) {
    if (!proxima_dosis) return true;
    return new Date(proxima_dosis) > new Date(fecha_aplicacion);
}

// ──────────────────────────────────────────────
// Helpers de pertenencia — misma lógica que el original,
// ahora usando Prisma en vez de db.query SQL directo.
// Exportadas para adjuntoController.js.
// ──────────────────────────────────────────────

async function verificarPertenenciaVacuna(vacunaId, usuarioId) {
    const vacuna = await prisma.vacuna.findFirst({
        where: { id: Number(vacunaId) },
        include: {
            integrante: { include: { grupo: { include: { miembros: { where: { usuarioId } } } } } },
            mascota:    { include: { grupo: { include: { miembros: { where: { usuarioId } } } } } }
        }
    });
    if (!vacuna) return false;
    const miembros = vacuna.integrante?.grupo?.miembros ?? vacuna.mascota?.grupo?.miembros ?? [];
    return miembros.length > 0;
}

async function verificarPertenenciaTratamiento(tratamientoId, usuarioId) {
    const tratamiento = await prisma.tratamiento.findFirst({
        where: { id: Number(tratamientoId) },
        include: {
            integrante: { include: { grupo: { include: { miembros: { where: { usuarioId } } } } } },
            mascota:    { include: { grupo: { include: { miembros: { where: { usuarioId } } } } } }
        }
    });
    if (!tratamiento) return false;
    const miembros = tratamiento.integrante?.grupo?.miembros ?? tratamiento.mascota?.grupo?.miembros ?? [];
    return miembros.length > 0;
}

async function verificarPertenenciaHistorial(historialId, usuarioId) {
    const historial = await prisma.historial.findFirst({
        where: { id: Number(historialId) },
        include: {
            integrante: { include: { grupo: { include: { miembros: { where: { usuarioId } } } } } },
            mascota:    { include: { grupo: { include: { miembros: { where: { usuarioId } } } } } }
        }
    });
    if (!historial) return false;
    const miembros = historial.integrante?.grupo?.miembros ?? historial.mascota?.grupo?.miembros ?? [];
    return miembros.length > 0;
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
        const nueva = await prisma.vacuna.create({
            data: {
                integranteId:    integrante_id ? Number(integrante_id) : null,
                mascotaId:       mascota_id    ? Number(mascota_id)    : null,
                nombre:          nombre.trim(),
                fechaAplicacion: new Date(fecha_aplicacion),
                proximaDosis:    proxima_dosis ? new Date(proxima_dosis) : null,
                notas:           notas || null
            },
            select: { id: true, nombre: true, fechaAplicacion: true, proximaDosis: true }
        });
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: nueva });
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
        const where = integrante_id
            ? { integranteId: Number(integrante_id) }
            : { mascotaId:    Number(mascota_id) };

        const vacunas = await prisma.vacuna.findMany({
            where,
            orderBy: { fechaAplicacion: 'desc' },
            select: { id: true, nombre: true, fechaAplicacion: true, proximaDosis: true, notas: true }
        });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: vacunas });
    } catch (err) {
        console.error('listarVacunas=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function editarVacuna(req, res) {
    const usuarioId = req.usuario.id;
    const vacunaId  = Number(req.params.id);
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

        await prisma.vacuna.update({
            where: { id: vacunaId },
            data: {
                nombre:          nombre.trim(),
                fechaAplicacion: new Date(fecha_aplicacion),
                proximaDosis:    proxima_dosis ? new Date(proxima_dosis) : null,
                notas:           notas || null
            }
        });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: vacunaId, nombre, fecha_aplicacion, proxima_dosis: proxima_dosis || null, notas: notas || null } });

    } catch (err) {
        console.error('editarVacuna=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarVacuna(req, res) {
    const usuarioId = req.usuario.id;
    const vacunaId  = Number(req.params.id);

    try {
        const esDelUsuario = await verificarPertenenciaVacuna(vacunaId, usuarioId);
        if (!esDelUsuario) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Vacuna no encontrada.' });
        }

        await prisma.vacuna.delete({ where: { id: vacunaId } });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: vacunaId } });

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
        const nuevo = await prisma.tratamiento.create({
            data: {
                integranteId: integrante_id ? Number(integrante_id) : null,
                mascotaId:    mascota_id    ? Number(mascota_id)    : null,
                descripcion:  descripcion.trim(),
                medicacion:   medicacion.trim(),
                fechaInicio:  new Date(fecha_inicio),
                fechaFin:     fecha_fin ? new Date(fecha_fin) : null
            },
            select: { id: true, descripcion: true, medicacion: true, fechaInicio: true }
        });
        return res.status(201).json({ codigo: 201, estado: 'ok', datos: nuevo });
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
        const where = integrante_id
            ? { integranteId: Number(integrante_id) }
            : { mascotaId:    Number(mascota_id) };

        const tratamientos = await prisma.tratamiento.findMany({
            where,
            orderBy: { fechaInicio: 'desc' },
            select: { id: true, descripcion: true, medicacion: true, fechaInicio: true, fechaFin: true }
        });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: tratamientos });
    } catch (err) {
        console.error('listarTratamientos=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function editarTratamiento(req, res) {
    const usuarioId      = req.usuario.id;
    const tratamientoId  = Number(req.params.id);
    const { descripcion, medicacion, fecha_inicio, fecha_fin } = req.body;

    if (!descripcion || !medicacion || !fecha_inicio) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'descripcion, medicacion y fecha_inicio son obligatorios.' });
    }

    try {
        const esDelUsuario = await verificarPertenenciaTratamiento(tratamientoId, usuarioId);
        if (!esDelUsuario) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Tratamiento no encontrado.' });
        }

        await prisma.tratamiento.update({
            where: { id: tratamientoId },
            data: {
                descripcion: descripcion.trim(),
                medicacion:  medicacion.trim(),
                fechaInicio: new Date(fecha_inicio),
                fechaFin:    fecha_fin ? new Date(fecha_fin) : null
            }
        });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: tratamientoId, descripcion, medicacion, fecha_inicio, fecha_fin: fecha_fin || null } });

    } catch (err) {
        console.error('editarTratamiento=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function eliminarTratamiento(req, res) {
    const usuarioId     = req.usuario.id;
    const tratamientoId = Number(req.params.id);

    try {
        const esDelUsuario = await verificarPertenenciaTratamiento(tratamientoId, usuarioId);
        if (!esDelUsuario) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Tratamiento no encontrado.' });
        }

        await prisma.tratamiento.delete({ where: { id: tratamientoId } });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: tratamientoId } });

    } catch (err) {
        console.error('eliminarTratamiento=', err.message);
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
        const where = integrante_id
            ? { integranteId: Number(integrante_id) }
            : { mascotaId:    Number(mascota_id) };

        const historial = await prisma.historial.findMany({
            where,
            orderBy: { fecha: 'desc' },
            select: { id: true, evento: true, fecha: true, descripcion: true }
        });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: historial });
    } catch (err) {
        console.error('consultarHistorial=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = {
    registrarVacuna, listarVacunas, editarVacuna, eliminarVacuna,
    registrarTratamiento, listarTratamientos, editarTratamiento, eliminarTratamiento,
    consultarHistorial,
    verificarPertenenciaVacuna, verificarPertenenciaTratamiento, verificarPertenenciaHistorial
};
