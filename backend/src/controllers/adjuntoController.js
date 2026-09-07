//Codigo por Claude
//1 — Controlador de adjuntos (fotos/PDF en vacunas, tratamientos, historial,
// integrantes y mascotas), respaldados por Cloudinary.
const db = require('../config/db');
const cloudinary = require('../config/cloudinary');
const { resolverGrupoId, verificarPertenenciaDirecta, extraerPadreUnico } = require('../utils/grupo');
const {
    verificarPertenenciaVacuna,
    verificarPertenenciaTratamiento,
    verificarPertenenciaHistorial,
} = require('./saludController');

// Único lugar donde se enumeran los 5 padres posibles — mismo orden/nombres
// que las columnas de `adjunto` (Scripts/04_adjuntos.sql) y su CHECK
// chk_adjunto_un_padre. Whitelist explícita: tipoPadre nunca puede ser otra
// cosa que una de estas 5 strings literales, así que interpolarlo en
// `${tipoPadre}_id` más abajo (nombre de columna, no puede ir parametrizado
// como valor) es seguro — no hay forma de que llegue un valor arbitrario.
const CAMPOS_PADRE = ['vacuna', 'tratamiento', 'historial', 'integrante', 'mascota'];

function extraerPadre(origen) {
    return extraerPadreUnico(origen, CAMPOS_PADRE);
}

// Despacha al helper de pertenencia correcto según el tipo de padre.
// vacuna/tratamiento/historial reusan los helpers de saludController.js
// (mismo JOIN vía integrante/mascota -> grupo_miembro); integrante/mascota
// son padres directos de grupo_id, así que verificarPertenenciaDirecta
// (utils/grupo.js — compartida con profesionalSaludController.js) alcanza.
async function verificarPertenenciaPadre(tipoPadre, padreId, usuarioId) {
    switch (tipoPadre) {
        case 'vacuna':
            return verificarPertenenciaVacuna(padreId, usuarioId);
        case 'tratamiento':
            return verificarPertenenciaTratamiento(padreId, usuarioId);
        case 'historial':
            return verificarPertenenciaHistorial(padreId, usuarioId);
        case 'integrante':
            return verificarPertenenciaDirecta('integrante', padreId, usuarioId);
        case 'mascota':
            return verificarPertenenciaDirecta('mascota', padreId, usuarioId);
        default:
            return false;
    }
}

// Sube un Buffer (memoria, ver config/upload.js) a Cloudinary vía stream —
// UploadStream es un Transform de Node, así que .end(buffer) alcanza, no
// hace falta streamifier ni escribir a disco.
function subirBuffer(buffer, options) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (err, resultado) => {
            if (err) return reject(err);
            resolve(resultado);
        });
        stream.end(buffer);
    });
}

//2 — POST /api/adjuntos
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
        // Carpeta por grupo -> tipo/id de padre — navegable desde el
        // dashboard de Cloudinary sin depender de mirar la base de datos:
        // domus/grupo-7/vacuna-12/<public_id auto>.
        const folder = `domus/grupo-${grupoId}/${tipoPadre}-${padreId}`;

        const resultado = await subirBuffer(req.file.buffer, {
            folder,
            resource_type: 'auto', // detecta imagen vs. pdf — Cloudinary guarda ambos como resource_type 'image' (confirmado en su doc de tipos de recurso)
        });

        const insertResult = await db.query(
            `INSERT INTO adjunto (${tipoPadre}_id, tipo_archivo, url, public_id, nombre_original, subido_por) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [padreId, tipoArchivo, resultado.secure_url, resultado.public_id, req.file.originalname || null, usuarioId]
        );

        return res.status(201).json({
            codigo: 201,
            estado: 'ok',
            datos: {
                id: insertResult.rows[0].id,
                tipo_archivo: tipoArchivo,
                url: resultado.secure_url,
                nombre_original: req.file.originalname || null,
                subido_por: usuarioId,
            },
        });

    } catch (err) {
        console.error('subirAdjunto=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//3 — GET /api/adjuntos?vacuna_id=X (o cualquier otro ?<tipo>_id=X)
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

        const { rows } = await db.query(
            `SELECT id, tipo_archivo, url, nombre_original, subido_por, subido_en
             FROM adjunto WHERE ${tipoPadre}_id = $1 ORDER BY subido_en DESC`,
            [padreId]
        );
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: rows });

    } catch (err) {
        console.error('listarAdjuntos=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//4 — DELETE /api/adjuntos/:id
// Orden deliberado: Cloudinary primero, fila de la base después. Si el
// borrado en Cloudinary falla, se corta ahí y la fila de `adjunto` NO se
// toca — mejor un adjunto "vivo" que ya se intentó borrar (reintentable,
// visible, sin costo real) que una fila borrada mientras el archivo real
// sigue existiendo en Cloudinary sin ninguna referencia que permita
// encontrarlo o limpiarlo después. `result: 'not found'` (ya no existe del
// lado de Cloudinary) se trata como éxito — es idempotente, el estado final
// deseado (nada en Cloudinary) ya se cumple.
async function eliminarAdjunto(req, res) {
    const usuarioId = req.usuario.id;
    const { id } = req.params;

    try {
        const { rows } = await db.query('SELECT * FROM adjunto WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Adjunto no encontrado.' });
        }
        const adjunto = rows[0];
        const tipoPadre = CAMPOS_PADRE.find((campo) => adjunto[`${campo}_id`] !== null);
        const padreId = adjunto[`${tipoPadre}_id`];

        const pertenece = await verificarPertenenciaPadre(tipoPadre, padreId, usuarioId);
        if (!pertenece) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Adjunto no encontrado.' });
        }

        const resultadoCloudinary = await cloudinary.uploader.destroy(adjunto.public_id, { resource_type: 'image' });
        if (resultadoCloudinary.result !== 'ok' && resultadoCloudinary.result !== 'not found') {
            console.error('eliminarAdjunto: Cloudinary destroy=', resultadoCloudinary);
            return res.status(502).json({ codigo: 502, estado: 'error', datos: 'No se pudo eliminar el archivo remoto. Intentá nuevamente.' });
        }

        await db.query('DELETE FROM adjunto WHERE id = $1', [id]);
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { id: Number(id) } });

    } catch (err) {
        console.error('eliminarAdjunto=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { subirAdjunto, listarAdjuntos, eliminarAdjunto };
