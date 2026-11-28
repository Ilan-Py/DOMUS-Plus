//Codigo por ILAN PITASHNY
//1 — Controlador de grupo familiar, integrantes y mascotas (CU3, CU4, CU5) — migrado a Prisma
const prisma = require('../config/prisma');
const { resolverGrupoId, resolverMembresia } = require('../utils/grupo');
const { FECHA_MINIMA, hoy, validarCampos } = require('../utils/validacion');

// Tipo, formato y largo de cada campo (ERR-011). Los obligatorios se chequean en cada función.
// MEJ-004: el tipo de integrante ya no se elige — se calcula con la fecha de
// nacimiento. Menor: hasta 17 años; adulto: de 18 a 64; mayor: desde 65.
const EDAD_ADULTO = 18;
const EDAD_MAYOR  = 65;

// Años cumplidos a hoy. Se usa UTC en las dos fechas porque las columnas DATE
// vuelven como medianoche UTC (y 'AAAA-MM-DD' se interpreta igual).
function calcularEdad(fechaNacimiento, hoy = new Date()) {
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
    const mes = hoy.getUTCMonth() - nacimiento.getUTCMonth();
    if (mes < 0 || (mes === 0 && hoy.getUTCDate() < nacimiento.getUTCDate())) edad--;
    return edad;
}

function tipoSegunEdad(fechaNacimiento) {
    const edad = calcularEdad(fechaNacimiento);
    if (edad < EDAD_ADULTO) return 'menor';
    if (edad < EDAD_MAYOR)  return 'adulto';
    return 'mayor';
}
const REGLAS_GRUPO      = { nombre: { tipo: 'texto', max: 150, etiqueta: 'nombre del grupo' } };
// Avatar elegido (id del catálogo de la app, ej. "dog-floppy"). Es opcional: si no viene en el body no se
// toca lo guardado; si viene vacío o null se borra (vuelve a iniciales/huellita).
const AVATAR_ID_VALIDO = /^[a-z0-9-]{1,40}$/;
function avatarIdInvalido(body) {
    const v = body.avatar_id;
    return v !== undefined && v !== null && v !== '' && !(typeof v === 'string' && AVATAR_ID_VALIDO.test(v));
}
function datosAvatar(body) {
    return body.avatar_id === undefined ? {} : { avatarId: body.avatar_id || null };
}
const MSJ_AVATAR = 'El avatar elegido no es válido.';
const REGLAS_INVITACION = { codigo: { tipo: 'texto', max: 20, etiqueta: 'código de invitación' } };
const REGLAS_INTEGRANTE = {
    nombre:           { tipo: 'nombrePersona', max: 100 }, // ERR-008: sin números
    apellido:         { tipo: 'nombrePersona', max: 100 },
    fecha_nacimiento: { tipo: 'fecha', etiqueta: 'fecha de nacimiento', desde: FECHA_MINIMA, hasta: hoy, mensajeDesde: 'La fecha de nacimiento no puede ser anterior a 1900.', mensajeHasta: 'La fecha de nacimiento no puede ser una fecha futura.' },
    observaciones:    { tipo: 'texto', max: 2000 }
};
// ERR-009: el tipo de sangre es uno de los 8 grupos. Antes se guardaba texto libre.
const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Corrige lo que se suele tipear distinto: minúsculas, espacios ("o +"), un
// cero en vez de la letra O ("0+"), un guion largo/signo menos ("A–") o el
// factor en palabras ("0 positivo", "AB negativo").
function normalizarTipoSangre(valor) {
    if (typeof valor !== 'string') return valor;
    return valor.toUpperCase().replace(/\s+/g, '').replace(/^0/, 'O').replace(/[–—−]/g, '-')
        .replace(/POSITIVO$/, '+').replace(/NEGATIVO$/, '-');
}

// ERR-010: alergias — las frecuentes de la lista y "Otras" escribiendo cuáles.
// Llegan como texto ("penicilina, mani") o como lista (["Penicilina", "Maní"]) y
// se guardan siempre como texto separado por comas, en la misma columna de antes.
const ALERGIAS_FRECUENTES = [
    'Penicilina', 'AINEs', 'Maní', 'Frutos secos', 'Mariscos', 'Lácteos',
    'Huevo', 'Gluten', 'Polen', 'Ácaros', 'Látex', 'Picadura de abeja'
];
// Otras formas de escribir una de la lista (comparadas sin tildes ni mayúsculas)
const ALIAS_ALERGIA = {
    'antiinflamatorios': 'AINEs', 'cacahuete': 'Maní', 'cacahuate': 'Maní',
    'leche': 'Lácteos', 'lactosa': 'Lácteos', 'nueces': 'Frutos secos',
    'abeja': 'Picadura de abeja', 'picadura de abejas': 'Picadura de abeja'
};
const MAX_LARGO_ALERGIA = 60;
const MAX_ALERGIAS      = 30;
// Letras, números ("Vitamina B12"), espacios, apóstrofes, paréntesis, punto, barra y guion
const PATRON_ALERGIA = /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s'’()./-]*$/u;

function sinTildes(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Devuelve { alergias } con el texto normalizado (o null si no hay), o { error }.
function normalizarAlergias(valor) {
    if (valor === undefined || valor === null || valor === '') return { alergias: null };

    let partes;
    if (Array.isArray(valor)) {
        if (!valor.every((v) => typeof v === 'string')) return { error: 'Cada alergia debe ser texto.' };
        partes = valor;
    } else if (typeof valor === 'string') {
        partes = valor.split(/[,;\n]/);
    } else {
        return { error: 'El campo alergias debe ser texto o una lista.' };
    }

    const yaCargadas = new Set();
    const resultado = [];
    for (const parte of partes) {
        const limpia = parte.trim().replace(/\s+/g, ' ');
        if (!limpia) continue;
        const clave = sinTildes(limpia);
        if (['otra', 'otras', 'otro', 'otros'].includes(clave)) {
            return { error: 'Si hay otras alergias, escribí cuáles (por ejemplo, Ibuprofeno).' };
        }
        if (limpia.length > MAX_LARGO_ALERGIA) {
            return { error: `Cada alergia admite como máximo ${MAX_LARGO_ALERGIA} caracteres.` };
        }
        if (!PATRON_ALERGIA.test(limpia) || !/\p{L}/u.test(limpia)) {
            return { error: `"${limpia}" no es una alergia válida: usá letras, números, espacios y guiones.` };
        }
        const nombre = ALERGIAS_FRECUENTES.find((a) => sinTildes(a) === clave)
            || ALIAS_ALERGIA[clave]
            || limpia.charAt(0).toUpperCase() + limpia.slice(1);
        if (!yaCargadas.has(sinTildes(nombre))) {
            yaCargadas.add(sinTildes(nombre));
            resultado.push(nombre);
        }
    }
    if (resultado.length > MAX_ALERGIAS) return { error: `Se pueden cargar hasta ${MAX_ALERGIAS} alergias.` };
    return { alergias: resultado.length ? resultado.join(', ') : null };
}

const REGLAS_EMERGENCIA = {
    alergias:         { tipo: 'texto', max: 2000 },
    tipo_sangre:      { tipo: 'enum', valores: GRUPOS_SANGUINEOS, etiqueta: 'tipo de sangre' },
    notas_emergencia: { tipo: 'texto', max: 2000, etiqueta: 'notas de emergencia' }
};
// MEJ-001: especie de la mascota — una de la lista, o "Otro" escribiendo cuál
// (se guarda lo escrito, ej. "Conejo", no la palabra "Otro").
const ESPECIES = ['Perro', 'Gato', 'Ave'];

// "perro" / "PERRO " → "Perro"; una especie escrita a mano queda con la primera
// letra en mayúscula y los espacios de más limpios ("pez  payaso" → "Pez payaso").
function normalizarEspecie(valor) {
    if (typeof valor !== 'string') return valor;
    const limpia = valor.trim().replace(/\s+/g, ' ');
    if (!limpia) return limpia;
    const deLaLista = ESPECIES.find((e) => e.toLowerCase() === limpia.toLowerCase());
    return deLaLista || limpia.charAt(0).toUpperCase() + limpia.slice(1).toLowerCase();
}

function esEspecieSinDetalle(especie) {
    return typeof especie === 'string' && ['otro', 'otra'].includes(especie.toLowerCase());
}

const REGLAS_MASCOTA = {
    nombre:           { tipo: 'texto', max: 100 },
    especie:          { tipo: 'nombrePersona', max: 50 }, // MEJ-001: sólo letras (sin números ni símbolos)
    raza:             { tipo: 'texto', max: 100 },
    fecha_nacimiento: { tipo: 'fecha', etiqueta: 'fecha de nacimiento', desde: FECHA_MINIMA, hasta: hoy, mensajeDesde: 'La fecha de nacimiento no puede ser anterior a 1900.', mensajeHasta: 'La fecha de nacimiento no puede ser una fecha futura.' },
    sexo:             { tipo: 'enum', valores: ['macho', 'hembra'], etiqueta: 'sexo' },
    microchip:        { tipo: 'texto', max: 30, etiqueta: 'microchip' },
    observaciones:    { tipo: 'texto', max: 500, etiqueta: 'nota' }
};

// Campos opcionales de la ficha rápida y la nota de la mascota. Sólo se tocan los que vienen en el pedido (las apps
// viejas no los mandan y no tienen que borrarlos).
function datosFichaMascota(body) {
    const datos = {};
    if ('sexo' in body) datos.sexo = body.sexo || null;
    if ('castrado' in body) datos.castrado = body.castrado === null || body.castrado === '' ? null : body.castrado === true || body.castrado === 'true';
    if ('microchip' in body) datos.microchip = body.microchip ? String(body.microchip).trim() : null;
    if ('observaciones' in body) datos.observaciones = body.observaciones ? String(body.observaciones).trim() : null;
    return datos;
}

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

    const errorCampos = validarCampos(req.body, REGLAS_GRUPO);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }

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

    const errorCampos = validarCampos(req.body, REGLAS_GRUPO);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }

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

// Código de invitación vigente (sólo el dueño). No genera uno nuevo: sirve para copiar el que ya existe
// sin invalidar el anterior. `codigo_invitacion` es null si todavía no se generó ninguno.
async function obtenerInvitacion(req, res) {
    const usuarioId = req.usuario.id;
    try {
        const membresia = await resolverMembresia(usuarioId);
        if (!membresia) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'No pertenecés a ningún grupo familiar.' });
        }
        if (membresia.rol !== 'dueno') {
            return res.status(403).json({ codigo: 403, estado: 'error', datos: 'Sólo el dueño del grupo puede ver el código de invitación.' });
        }
        const grupo = await prisma.grupoFamiliar.findUnique({
            where: { id: membresia.grupo_id },
            select: { codigoInvitacion: true }
        });
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: { codigo_invitacion: grupo?.codigoInvitacion || null } });
    } catch (err) {
        console.error('obtenerInvitacion=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function unirseGrupo(req, res) {
    const usuarioId = req.usuario.id;
    const { codigo } = req.body;

    const errorCampos = validarCampos(req.body, REGLAS_INVITACION);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }

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
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Ese código no existe o ya fue reemplazado por uno nuevo. Revisá que esté bien escrito o pedile otro a quien te invitó.' });
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
            include: { usuario: { select: { id: true, nombre: true, apellido: true, avatarId: true } } },
            orderBy: [{ joinedAt: 'asc' }]
        });

        // En la BD el rol es 'dueno' (Prisma no admite ñ en un enum), pero la API
        // siempre devolvió 'dueño' y la pantalla Cuenta compara contra eso para
        // mostrar invitar, renombrar y quitar miembros. Se traduce acá.
        const datos = miembros.map((m) => ({
            usuario_id: m.usuario.id,
            nombre:     m.usuario.nombre,
            apellido:   m.usuario.apellido,
            avatar_id:  m.usuario.avatarId,
            rol:        m.rol === 'dueno' ? 'dueño' : m.rol,
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
    // `tipo` se ignora si viene: se calcula con la fecha de nacimiento (MEJ-004)
    const { nombre, apellido, fecha_nacimiento, observaciones } = req.body;

    const errorCampos = validarCampos(req.body, REGLAS_INTEGRANTE);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }

    if (!nombre || !apellido || !fecha_nacimiento) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre, apellido y fecha_nacimiento son obligatorios.' });
    }
    if (esFechaFutura(fecha_nacimiento)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha de nacimiento no puede ser una fecha futura.' });
    }
    const tipo = tipoSegunEdad(fecha_nacimiento);
    if (avatarIdInvalido(req.body)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: MSJ_AVATAR });
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
                observaciones:   observaciones || null,
                ...datosAvatar(req.body)
            },
            select: { id: true, nombre: true, apellido: true, fechaNacimiento: true, tipo: true, avatarId: true }
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
        // El tipo se recalcula al listar: así un integrante que cumplió 18 (o 65)
        // pasa a adulto (o mayor) sin que nadie tenga que editarlo (MEJ-004).
        const conTipoActual = integrantes.map((i) => ({ ...i, tipo: tipoSegunEdad(i.fechaNacimiento) }));
        return res.status(200).json({ codigo: 200, estado: 'ok', datos: conTipoActual });
    } catch (err) {
        console.error('listarIntegrantes=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

async function editarIntegrante(req, res) {
    const usuarioId    = req.usuario.id;
    const integranteId = Number(req.params.id);
    // `tipo` se ignora si viene: se calcula con la fecha de nacimiento (MEJ-004)
    const { nombre, apellido, fecha_nacimiento, observaciones } = req.body;

    const errorCampos = validarCampos(req.body, REGLAS_INTEGRANTE);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }

    if (!nombre || !apellido || !fecha_nacimiento) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre, apellido y fecha_nacimiento son obligatorios.' });
    }
    if (esFechaFutura(fecha_nacimiento)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'La fecha de nacimiento no puede ser una fecha futura.' });
    }
    const tipo = tipoSegunEdad(fecha_nacimiento);
    if (avatarIdInvalido(req.body)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: MSJ_AVATAR });
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
                observaciones:   observaciones || null,
                ...datosAvatar(req.body)
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

        // COP-01 (docs/ux/05-copy.md §7): lo programado para esta persona/mascota se borra con ella. Antes quedaba en el
        // calendario sin dueño (el recordatorio tiene onDelete: SetNull para no perder los vinculados a vacunas).
        const [, resultado] = await prisma.$transaction([
            prisma.recordatorio.deleteMany({ where: { integranteId: integranteId, grupoId } }),
            prisma.integrante.deleteMany({ where: { id: integranteId, grupoId } })
        ]);
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
    const { notas_emergencia } = req.body;
    const tipo_sangre = normalizarTipoSangre(req.body.tipo_sangre);
    const { alergias, error: errorAlergias } = normalizarAlergias(req.body.alergias);
    if (errorAlergias) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorAlergias });
    }

    const errorCampos = validarCampos({ ...req.body, tipo_sangre, alergias }, REGLAS_EMERGENCIA);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }

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
    const { nombre, raza, fecha_nacimiento } = req.body;
    const especie = normalizarEspecie(req.body.especie);

    const errorCampos = validarCampos({ ...req.body, especie }, REGLAS_MASCOTA);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }
    if (esEspecieSinDetalle(especie)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Si la especie es "Otro", escribí cuál es (por ejemplo, Conejo).' });
    }

    if (!nombre || !especie) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre y especie son obligatorios.' });
    }
    if (avatarIdInvalido(req.body)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: MSJ_AVATAR });
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
                fechaNacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
                ...datosFichaMascota(req.body),
                ...datosAvatar(req.body)
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
    const { nombre, raza, fecha_nacimiento } = req.body;
    const especie = normalizarEspecie(req.body.especie);

    const errorCampos = validarCampos({ ...req.body, especie }, REGLAS_MASCOTA);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }
    if (esEspecieSinDetalle(especie)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Si la especie es "Otro", escribí cuál es (por ejemplo, Conejo).' });
    }

    if (!nombre || !especie) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'nombre y especie son obligatorios.' });
    }
    if (avatarIdInvalido(req.body)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: MSJ_AVATAR });
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
                fechaNacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
                ...datosFichaMascota(req.body),
                ...datosAvatar(req.body)
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

        // COP-01 (docs/ux/05-copy.md §7): lo programado para esta persona/mascota se borra con ella. Antes quedaba en el
        // calendario sin dueño (el recordatorio tiene onDelete: SetNull para no perder los vinculados a vacunas).
        const [, resultado] = await prisma.$transaction([
            prisma.recordatorio.deleteMany({ where: { mascotaId: mascotaId, grupoId } }),
            prisma.mascota.deleteMany({ where: { id: mascotaId, grupoId } })
        ]);
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
    generarInvitacion, obtenerInvitacion, unirseGrupo, listarMiembros, eliminarMiembro, salirGrupo, eliminarGrupo,
    agregarIntegrante, listarIntegrantes, editarIntegrante, eliminarIntegrante, editarEmergenciaIntegrante,
    agregarMascota, listarMascotas, editarMascota, eliminarMascota,
    tipoSegunEdad // también lo usan las estadísticas del admin
};
