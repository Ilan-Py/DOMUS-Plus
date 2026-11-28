//1 — Registro de actividad (auditoría)
// Guarda quién hizo qué tipo de acción, sobre qué tipo de dato y cuándo, para el
// panel del administrador. NUNCA guarda el contenido: ni el body, ni contraseñas,
// ni tokens, ni datos médicos. Sólo usuario, acción, entidad, id de la entidad y fecha.
const prisma = require('../config/prisma');

// Cuántos días se conservan los registros. Pasado ese plazo se borran solos.
const RETENCION_DIAS = Number(process.env.RETENCION_ACTIVIDAD_DIAS) || 180;

// Guarda un registro sin frenar ni romper el pedido: si falla, sólo queda en consola.
function registrarAccion(usuarioId, accion, { entidad = null, entidadId = null, detalle = null } = {}) {
    return prisma.registroActividad
        .create({ data: { usuarioId, accion, entidad, entidadId, detalle } })
        .catch((err) => console.error('registrarAccion=', err.message));
}

//2 — Qué se registra de cada ruta
// Sólo se registran las escrituras que terminan bien (2xx). Las lecturas (GET) no.
// El login se registra en authController, porque ahí recién se sabe quién es.
// idDe: 'url' = el número de la URL · 'respuesta' = datos.id de la respuesta.
const RUTAS = [];
function ruta(metodo, patron, accion, entidad, idDe = null) {
    RUTAS.push({ metodo, patron: new RegExp(`^/api${patron}$`), accion, entidad, idDe });
}
// Alta, modificación y baja de un recurso con la forma /base y /base/:id
function crud(base, entidad) {
    ruta('POST',   base,            'alta',         entidad, 'respuesta');
    ruta('PATCH',  `${base}/(\\d+)`, 'modificacion', entidad, 'url');
    ruta('DELETE', `${base}/(\\d+)`, 'eliminacion',  entidad, 'url');
}

ruta('POST',   '/auth/registrar', 'alta',         'usuario', 'respuesta');
ruta('PATCH',  '/auth/perfil',    'modificacion', 'perfil');
ruta('PATCH',  '/auth/password',  'modificacion', 'contraseña');

ruta('POST',   '/familia/grupo',            'alta',         'grupo', 'respuesta');
ruta('PATCH',  '/familia/grupo',            'modificacion', 'grupo');
ruta('DELETE', '/familia/grupo',            'eliminacion',  'grupo');
ruta('POST',   '/familia/grupo/invitacion', 'alta',         'invitacion');
ruta('POST',   '/familia/grupo/unirse',     'alta',         'miembro');
ruta('POST',   '/familia/grupo/salir',      'eliminacion',  'miembro');
ruta('DELETE', '/familia/grupo/miembros/(\\d+)', 'eliminacion', 'miembro', 'url');

ruta('PATCH',  '/familia/integrantes/(\\d+)/emergencia', 'modificacion', 'ficha_emergencia', 'url');
crud('/familia/integrantes', 'integrante');
ruta('POST',   '/familia/integrantes/(\\d+)/contactos-emergencia', 'alta', 'contacto_emergencia', 'respuesta');
ruta('PATCH',  '/familia/contactos-emergencia/(\\d+)', 'modificacion', 'contacto_emergencia', 'url');
ruta('DELETE', '/familia/contactos-emergencia/(\\d+)', 'eliminacion',  'contacto_emergencia', 'url');
crud('/familia/mascotas', 'mascota');

crud('/salud/vacunas',       'vacuna');
crud('/salud/tratamientos',  'tratamiento');
crud('/salud/profesionales', 'profesional');

ruta('PATCH',  '/recordatorios/(\\d+)/desactivar', 'modificacion', 'recordatorio', 'url');
ruta('PATCH',  '/recordatorios/(\\d+)/marcar',     'modificacion', 'recordatorio', 'url');
ruta('PATCH',  '/recordatorios/(\\d+)/reactivar',  'modificacion', 'recordatorio', 'url');
crud('/recordatorios', 'recordatorio');

ruta('POST',   '/adjuntos',         'alta',        'adjunto', 'respuesta');
ruta('DELETE', '/adjuntos/(\\d+)',  'eliminacion', 'adjunto', 'url');

//3 — Middleware: después de responder, registra la acción si la ruta está en la lista
function registrarActividad(req, res, next) {
    if (req.method === 'GET') return next();

    // Se guarda la respuesta sólo para leer datos.id (el id de lo que se creó).
    const jsonOriginal = res.json.bind(res);
    res.json = (cuerpo) => {
        res.locals.cuerpoRespuesta = cuerpo;
        return jsonOriginal(cuerpo);
    };

    res.on('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return;

        const camino = req.originalUrl.split('?')[0].replace(/\/+$/, '');
        for (const r of RUTAS) {
            if (r.metodo !== req.method) continue;
            const coincidencia = camino.match(r.patron);
            if (!coincidencia) continue;

            const datos = res.locals.cuerpoRespuesta && res.locals.cuerpoRespuesta.datos;
            const idRespuesta = datos && Number.isInteger(datos.id) ? datos.id : null;

            let entidadId = null;
            if (r.idDe === 'url') entidadId = Number(coincidencia[1]);
            if (r.idDe === 'respuesta') entidadId = idRespuesta;

            // En el registro todavía no hay sesión: la acción es de la cuenta recién creada.
            const usuarioId = req.usuario ? req.usuario.id : (r.entidad === 'usuario' ? idRespuesta : null);
            if (!usuarioId) return;

            registrarAccion(usuarioId, r.accion, { entidad: r.entidad, entidadId });
            return;
        }
    });

    next();
}

//4 — Período de conservación: borra los registros más viejos que RETENCION_DIAS
async function limpiarRegistrosViejos() {
    const limite = new Date(Date.now() - RETENCION_DIAS * 24 * 60 * 60 * 1000);
    try {
        const { count } = await prisma.registroActividad.deleteMany({ where: { fecha: { lt: limite } } });
        if (count > 0) console.log(`Registro de actividad: ${count} registros de más de ${RETENCION_DIAS} días borrados.`);
    } catch (err) {
        console.error('limpiarRegistrosViejos=', err.message);
    }
}

// Al arrancar el servidor y después una vez por día
function programarLimpiezaDeRegistros() {
    limpiarRegistrosViejos();
    setInterval(limpiarRegistrosViejos, 24 * 60 * 60 * 1000).unref();
}

module.exports = { registrarAccion, registrarActividad, programarLimpiezaDeRegistros, RETENCION_DIAS };
