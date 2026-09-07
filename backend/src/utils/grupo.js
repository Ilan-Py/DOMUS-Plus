//Codigo por ILAN PITASHNY
//1 — Resolución de pertenencia a grupo vía grupo_miembro. Único punto de
// verdad para "a qué grupo pertenece este usuario" — desde la migración de
// Fase 1 (Scripts/03_grupo_compartido.sql) grupo_familiar.usuario_id ya no
// existe, todo pasa por acá en vez de repetir el JOIN/SELECT en cada
// controlador.
const db = require('../config/db');

async function resolverGrupoId(usuarioId) {
    const { rows } = await db.query(
        'SELECT grupo_id FROM grupo_miembro WHERE usuario_id = $1', [usuarioId]
    );
    return rows.length > 0 ? rows[0].grupo_id : null;
}

async function resolverMembresia(usuarioId) {
    const { rows } = await db.query(
        'SELECT grupo_id, rol FROM grupo_miembro WHERE usuario_id = $1', [usuarioId]
    );
    return rows.length > 0 ? rows[0] : null;
}

// Pertenencia de un padre "directo" (integrante o mascota — ambos tienen su
// propio grupo_id, a diferencia de vacuna/tratamiento/historial/adjunto que
// cuelgan de uno de esos dos). `tabla` sólo llega como literal ('integrante'
// o 'mascota') desde whitelists explícitas en cada caller (CAMPOS_PADRE de
// adjuntoController.js/profesionalSaludController.js, o un string fijo como
// en contactoEmergenciaController.js) — nunca de un valor arbitrario del
// usuario, así que interpolarlo en el nombre de la tabla es seguro. Extraído
// acá para que adjuntoController.js (la feature de adjuntos) y
// profesionalSaludController.js (esta feature) compartan el mismo chequeo en
// vez de repetirlo un sexto/séptimo lugar.
async function verificarPertenenciaDirecta(tabla, id, usuarioId) {
    const grupoId = await resolverGrupoId(usuarioId);
    if (!grupoId) return false;
    const { rows } = await db.query(`SELECT id FROM ${tabla} WHERE id = $1 AND grupo_id = $2`, [id, grupoId]);
    return rows.length > 0;
}

// Lee de `origen` (req.body en POST, req.query en GET) cuál de los
// `${campo}_id` de `camposPadre` está presente, exigiendo que sea
// exactamente uno — mismo criterio que los CHECK constraints "un solo padre"
// de este proyecto (chk_adjunto_un_padre, chk_profesional_un_padre).
// Reusado por adjuntoController.js (5 padres posibles) y
// profesionalSaludController.js (2 padres posibles) en vez de repetir esta
// extracción en cada uno.
function extraerPadreUnico(origen, camposPadre) {
    const presentes = camposPadre.filter((campo) => origen[`${campo}_id`]);
    if (presentes.length !== 1) {
        return { error: `Debe indicar exactamente uno de: ${camposPadre.map((c) => `${c}_id`).join(', ')}.` };
    }
    const tipoPadre = presentes[0];
    const padreId = origen[`${tipoPadre}_id`];
    return { tipoPadre, padreId };
}

module.exports = { resolverGrupoId, resolverMembresia, verificarPertenenciaDirecta, extraerPadreUnico };
