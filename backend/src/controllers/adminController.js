//1 — Panel del administrador: estadísticas generales e historial de actividad
// Todo lo que devuelve es global y agregado. Nunca devuelve nombres de integrantes o
// mascotas, datos médicos, nombres de grupos ni contenido de adjuntos.
// El historial muestra el id de la cuenta; el email sólo se ve con GET /usuarios/:id
// y un motivo, y esa consulta queda registrada.
const prisma = require('../config/prisma');
const { validarCampos } = require('../utils/validacion');
const { registrarAccion } = require('../utils/actividad');
const { tipoSegunEdad } = require('./familiaController');

const CATEGORIAS = ['login', 'alta', 'modificacion', 'eliminacion'];
const DIA_MS = 24 * 60 * 60 * 1000;

const REGLAS_ESTADISTICAS = { dias: { tipo: 'entero', min: 1, max: 90, etiqueta: 'días' } };
const REGLAS_ACTIVIDAD = {
    pagina:     { tipo: 'entero', min: 1, max: 100000, etiqueta: 'página' },
    por_pagina: { tipo: 'entero', min: 1, max: 100, etiqueta: 'por página' },
    usuario_id: { tipo: 'id', etiqueta: 'usuario' },
    accion:     { tipo: 'enum', valores: [...CATEGORIAS, 'consulta'], etiqueta: 'acción' },
    desde:      { tipo: 'fecha' },
    hasta:      { tipo: 'fecha' }
};
const REGLAS_IDENTIFICAR = { motivo: { tipo: 'texto', max: 200 } };

//2 — Especies de mascotas
// Perro y Gato vienen del desplegable; con "Otro" el usuario escribe la especie.
// Cada especie escrita a mano es una categoría propia, agrupando las variantes:
// "Conejo", "cOnejo " y "CONEJO" cuentan como una sola. No se toca lo guardado:
// se normaliza sólo para contar.
function claveEspecie(texto) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// De las formas escritas de una misma especie se muestra la que tiene acentos
// ("Hámster" antes que "hamster") y, si empatan, la más usada.
function nombreParaMostrar(formas) {
    const acentos = (t) => (t.normalize('NFD').match(/[̀-ͯ]/g) || []).length;
    const [mejor] = Object.entries(formas).sort(([a, na], [b, nb]) => acentos(b) - acentos(a) || nb - na);
    const limpia = mejor[0].trim().replace(/\s+/g, ' ');
    return limpia.charAt(0).toUpperCase() + limpia.slice(1).toLowerCase();
}

function contarEspecies(mascotas) {
    const grupos = new Map(); // clave → { cantidad, formas: { texto: veces } }
    let sinEspecificar = 0;
    for (const { especie } of mascotas) {
        const clave = typeof especie === 'string' ? claveEspecie(especie) : '';
        if (!clave || clave === 'otro' || clave === 'otra') { sinEspecificar++; continue; }
        const grupo = grupos.get(clave) || { cantidad: 0, formas: {} };
        grupo.cantidad++;
        grupo.formas[especie] = (grupo.formas[especie] || 0) + 1;
        grupos.set(clave, grupo);
    }
    const porEspecie = [...grupos.values()]
        .map((g) => ({ especie: nombreParaMostrar(g.formas), cantidad: g.cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad || a.especie.localeCompare(b.especie, 'es'));
    if (sinEspecificar > 0) porEspecie.push({ especie: 'Sin especificar', cantidad: sinEspecificar });
    return porEspecie;
}

//3 — Fechas en hora local del servidor (TZ de Argentina en docker-compose)
function claveDia(fecha) {
    const d = new Date(fecha);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function inicioDelDia(fecha) {
    const d = new Date(fecha);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

//4 — GET /api/admin/estadisticas?dias=7
// `dias` (1 a 90, por defecto 7) es el período del gráfico y de las acciones por categoría.
async function obtenerEstadisticas(req, res) {
    const errorCampos = validarCampos(req.query, REGLAS_ESTADISTICAS);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }
    const dias = req.query.dias ? Number(req.query.dias) : 7;

    try {
        const ahora = new Date();
        const hoy = inicioDelDia(ahora);
        const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1));
        const haceSieteDias = new Date(ahora.getTime() - 7 * DIA_MS);
        const inicioDeMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        // Las cuentas de admin no cuentan como usuarios de la plataforma
        const deUsuarios = { usuario: { rol: 'usuario' } };

        const [
            totalUsuarios, nuevosMes, activos,
            totalGrupos, totalMembresias,
            integrantes, mascotas, totalAdjuntos,
            acciones
        ] = await Promise.all([
            prisma.usuario.count({ where: { rol: 'usuario' } }),
            prisma.usuario.count({ where: { rol: 'usuario', createdAt: { gte: inicioDeMes, lte: ahora } } }),
            prisma.registroActividad.findMany({
                where: { ...deUsuarios, accion: { in: CATEGORIAS }, fecha: { gte: haceSieteDias, lte: ahora } },
                distinct: ['usuarioId'],
                select: { usuarioId: true }
            }),
            prisma.grupoFamiliar.count(),
            prisma.grupoMiembro.count(),
            prisma.integrante.findMany({ select: { fechaNacimiento: true } }),
            prisma.mascota.findMany({ select: { especie: true } }),
            prisma.adjunto.count(),
            prisma.registroActividad.findMany({
                where: { ...deUsuarios, accion: { in: CATEGORIAS }, fecha: { gte: desde, lte: ahora } },
                select: { accion: true, fecha: true }
            })
        ]);

        // Integrantes por tipo, con la misma regla de edad que el resto de la app (MEJ-004)
        const porTipo = { menor: 0, adulto: 0, mayor: 0 };
        integrantes.forEach((i) => { porTipo[tipoSegunEdad(i.fechaNacimiento)]++; });

        // Acciones por día, incluidos los días sin actividad
        const porDia = new Map();
        for (let i = 0; i < dias; i++) {
            porDia.set(claveDia(new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + i)), 0);
        }
        const porCategoria = Object.fromEntries(CATEGORIAS.map((c) => [c, 0]));
        for (const a of acciones) {
            const dia = claveDia(a.fecha);
            if (porDia.has(dia)) porDia.set(dia, porDia.get(dia) + 1);
            porCategoria[a.accion]++;
        }

        return res.status(200).json({
            codigo: 200,
            estado: 'ok',
            datos: {
                usuarios: {
                    total: totalUsuarios,
                    activos_ultimos_7_dias: activos.length,
                    nuevos_mes: nuevosMes
                },
                grupos: {
                    total: totalGrupos,
                    promedio_cuentas_por_grupo: totalGrupos ? Math.round((totalMembresias / totalGrupos) * 10) / 10 : 0
                },
                integrantes: {
                    total: integrantes.length,
                    menores: porTipo.menor,
                    adultos: porTipo.adulto,
                    mayores: porTipo.mayor
                },
                // Lista y no objeto: los nombres de especie ("Hámster") no pueden ser claves,
                // porque la API pasa todas las claves a snake_case.
                mascotas: {
                    total: mascotas.length,
                    por_especie: contarEspecies(mascotas)
                },
                adjuntos: { total: totalAdjuntos },
                actividad: {
                    dias,
                    desde: claveDia(desde),
                    hasta: claveDia(hoy),
                    acciones_por_dia: [...porDia].map(([fecha, cantidad]) => ({ fecha, cantidad })),
                    acciones_por_categoria: porCategoria
                }
            }
        });
    } catch (err) {
        console.error('obtenerEstadisticas=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//5 — GET /api/admin/actividad?pagina=1&por_pagina=50&usuario_id=&accion=&desde=&hasta=
// Historial individual: qué cuenta (por id), qué acción, sobre qué tipo de dato y cuándo.
async function listarActividad(req, res) {
    const errorCampos = validarCampos(req.query, REGLAS_ACTIVIDAD);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }
    const { usuario_id, accion, desde, hasta } = req.query;
    const pagina    = req.query.pagina ? Number(req.query.pagina) : 1;
    const porPagina = req.query.por_pagina ? Number(req.query.por_pagina) : 50;

    const where = {};
    if (usuario_id) where.usuarioId = Number(usuario_id);
    if (accion) where.accion = accion;
    if (desde || hasta) {
        where.fecha = {};
        if (desde) where.fecha.gte = new Date(`${desde}T00:00:00`);
        if (hasta) where.fecha.lt = new Date(new Date(`${hasta}T00:00:00`).getTime() + DIA_MS); // incluye todo el día
    }

    try {
        const [total, registros] = await Promise.all([
            prisma.registroActividad.count({ where }),
            prisma.registroActividad.findMany({
                where,
                orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
                skip: (pagina - 1) * porPagina,
                take: porPagina,
                select: { id: true, fecha: true, usuarioId: true, accion: true, entidad: true, entidadId: true, detalle: true }
            })
        ]);
        return res.status(200).json({
            codigo: 200,
            estado: 'ok',
            datos: { total, pagina, por_pagina: porPagina, registros }
        });
    } catch (err) {
        console.error('listarActividad=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//6 — GET /api/admin/usuarios/:id?motivo=...
// Identifica una cuenta (nombre y email) cuando hay una razón administrativa o de
// seguridad. El motivo es obligatorio y la consulta queda en el registro.
async function identificarUsuario(req, res) {
    const errorCampos = validarCampos(req.query, REGLAS_IDENTIFICAR);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }
    const motivo = typeof req.query.motivo === 'string' ? req.query.motivo.trim() : '';
    if (!motivo) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Indicá el motivo para identificar la cuenta.' });
    }

    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: Number(req.params.id) },
            select: { id: true, nombre: true, apellido: true, email: true, rol: true, createdAt: true }
        });
        if (!usuario) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Usuario no encontrado.' });
        }
        await registrarAccion(req.usuario.id, 'consulta', { entidad: 'usuario', entidadId: usuario.id, detalle: motivo });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: usuario });
    } catch (err) {
        console.error('identificarUsuario=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { obtenerEstadisticas, listarActividad, identificarUsuario, contarEspecies };
