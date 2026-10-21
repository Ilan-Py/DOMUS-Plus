// Controlador de adjuntos (fotos/PDF) — polimórfico de 5 padres posibles,
// respaldados por Cloudinary. La lógica de Cloudinary no cambia; solo las
// queries de BD se migran de db.query a Prisma.
const prisma     = require('../config/prisma');
const cloudinary = require('../config/cloudinary');
const { resolverGrupoId, verificarPertenenciaDirecta, extraerPadreUnico } = require('../utils/grupo');
const {
    verificarPertenenciaVacuna,
    verificarPertenenciaTratamiento,
    verificarPertenenciaHistorial,
} = require('./saludController');

// Whitelist de los 5 padres posibles — misma restricción que
// chk_adjunto_un_padre en el schema. Interpolarlo en nombres de campo de
// Prisma es seguro porque nunca llega un valor fuera de esta lista.
const CAMPOS_PADRE = ['vacuna', 'tratamiento', 'historial', 'integrante', 'mascota'];

function extraerPadre(origen) {
    return extraerPadreUnico(origen, CAMPOS_PADRE);
}

async function verificarPertenenciaPadre(tipoPadre, padreId, usuarioId) {
    switch (tipoPadre) {
        case 'vacuna':      return verificarPertenenciaVacuna(padreId, usuarioId);
        case 'tratamiento': return verificarPertenenciaTratamiento(padreId, usuarioId);
        case 'historial':   return verificarPertenenciaHistorial(padreId, usuarioId);
        case 'integrante':  return verificarPertenenciaDirecta('integrante', padreId, usuarioId);
        case 'mascota':     return verificarPertenenciaDirecta('mascota', padreId, usuarioId);
        default:            return false;
    }
}

// Sube un Buffer a Cloudinary vía stream — sin escribir a disco.
function subirBuffer(buffer, options) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (err, resultado) => {
            if (err) return reject(err);
            resolve(resultado);
        });
        stream.end(buffer);
    });
}

// POST /api/adjuntos
async function subirAdjunto(req, res) {
    const usuarioId = req.usuario.id;
    const { tipoPadre, padreId, error } = extraerPadre(req.body);
    if (error) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: error });
    }

    try {
        const grupoId = await resolverGrupoId(usuarioId);
        if (!grupoId) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No pertenecés a ningún grupo familiar.' });
        }

        const pertenece = await verificarPertenenciaPadre(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Registro no encontrado.' });
        }

        const tipoArchivo = req.file.mimetype === 'application/pdf' ? 'pdf' : 'imagen';
        const folder      = `domus/grupo-${grupoId}/${tipoPadre}-${padreId}`;

        const resultado = await subirBuffer(req.file.buffer, { folder, resource_type: 'auto' });

        // Construye el data de Prisma dinámicamente — solo uno de los 5
        // campos _id va poblado, igual que el CHECK del schema.
        const dataAdjunto = {
            tipoArchivo,
            url:           resultado.secure_url,
            publicId:      resultado.public_id,
            nombreOriginal: req.file.originalname || null,
            subidoPor:     usuarioId,
            vacunaId:      tipoPadre === 'vacuna'      ? padreId : null,
            tratamientoId: tipoPadre === 'tratamiento' ? padreId : null,
            historialId:   tipoPadre === 'historial'   ? padreId : null,
            integranteId:  tipoPadre === 'integrante'  ? padreId : null,
            mascotaId:     tipoPadre === 'mascota'     ? padreId : null,
        };

        const nuevo = await prisma.adjunto.create({
            data: dataAdjunto,
            select: { id: true, tipoArchivo: true, url: true, nombreOriginal: true, subidoPor: true }
        });

        return res.status(201).json({ codigo: 201, estado: 'ok', datos: nuevo });

    } catch (err) {
        console.error('subirAdjunto=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// GET /api/adjuntos?vacuna_id=X (o cualquier otro ?<tipo>_id=X)
async function listarAdjuntos(req, res) {
    const usuarioId = req.usuario.id;
    const { tipoPadre, padreId, error } = extraerPadre(req.query);
    if (error) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: error });
    }

    try {
        const pertenece = await verificarPertenenciaPadre(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Registro no encontrado.' });
        }

        const where = {
            vacunaId:      tipoPadre === 'vacuna'      ? padreId : null,
            tratamientoId: tipoPadre === 'tratamiento' ? padreId : null,
            historialId:   tipoPadre === 'historial'   ? padreId : null,
            integranteId:  tipoPadre === 'integrante'  ? padreId : null,
            mascotaId:     tipoPadre === 'mascota'     ? padreId : null,
        };
        // Filtramos las claves null para que Prisma no las incluya en el WHERE
        Object.keys(where).forEach((k) => where[k] === null && delete where[k]);

        const adjuntos = await prisma.adjunto.findMany({
            where,
            orderBy: { subidoEn: 'desc' },
            select: { id: true, tipoArchivo: true, url: true, nombreOriginal: true, subidoPor: true, subidoEn: true }
        });

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: adjuntos });

    } catch (err) {
        console.error('listarAdjuntos=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

// DELETE /api/adjuntos/:id
// Cloudinary primero, BD después — si falla Cloudinary no se toca la fila.
async function eliminarAdjunto(req, res) {
    const usuarioId = req.usuario.id;
    const id        = Number(req.params.id);

    try {
        const adjunto = await prisma.adjunto.findUnique({ where: { id } });
        if (!adjunto) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Adjunto no encontrado.' });
        }

        const tipoPadre = CAMPOS_PADRE.find((campo) => {
            const key = campo === 'vacuna'      ? 'vacunaId'
                      : campo === 'tratamiento' ? 'tratamientoId'
                      : campo === 'historial'   ? 'historialId'
                      : campo === 'integrante'  ? 'integranteId'
                      :                          'mascotaId';
            return adjunto[key] !== null;
        });
        const key     = tipoPadre === 'vacuna'      ? 'vacunaId'
                      : tipoPadre === 'tratamiento' ? 'tratamientoId'
                      : tipoPadre === 'historial'   ? 'historialId'
                      : tipoPadre === 'integrante'  ? 'integranteId'
                      :                              'mascotaId';
        const padreId = adjunto[key];

        const pertenece = await verificarPertenenciaPadre(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Adjunto no encontrado.' });
        }

        const resultadoCloudinary = await cloudinary.uploader.destroy(adjunto.publicId, { resource_type: 'image' });
        if (resultadoCloudinary.result !== 'ok' && resultadoCloudinary.result !== 'not found') {
            console.error('eliminarAdjunto: Cloudinary destroy=', resultadoCloudinary);
            return res.status(502).json({ codigo: 502, estado: 'error', datos: 'No se pudo eliminar el archivo remoto. Intentá nuevamente.' });
        }

        await prisma.adjunto.delete({ where: { id } });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id } });

    } catch (err) {
        console.error('eliminarAdjunto=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { subirAdjunto, listarAdjuntos, eliminarAdjunto };
