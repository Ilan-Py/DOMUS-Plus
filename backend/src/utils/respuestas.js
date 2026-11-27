//1 — Normaliza las claves de `datos` a snake_case en todas las respuestas
// Prisma devuelve los modelos en camelCase (fechaHora, tipoSangre,
// fechaNacimiento...), pero el frontend lee snake_case (fecha_hora,
// tipo_sangre, fecha_nacimiento...), igual que lo que envía en los body.
// En vez de mapear a mano en cada controller, se convierte acá una sola vez
// para toda la API. Las claves que ya vienen en snake_case quedan iguales.

function aSnakeCase(clave) {
    return clave.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

// Sólo se recorren objetos planos y arrays: un Date (o cualquier otra
// instancia) se deja tal cual para que JSON lo serialice como siempre.
function esObjetoPlano(valor) {
    return valor !== null && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype;
}

function clavesASnakeCase(valor) {
    if (Array.isArray(valor)) return valor.map(clavesASnakeCase);
    if (!esObjetoPlano(valor)) return valor;
    const resultado = {};
    for (const [clave, v] of Object.entries(valor)) {
        resultado[aSnakeCase(clave)] = clavesASnakeCase(v);
    }
    return resultado;
}

//2 — Middleware: envuelve res.json y convierte sólo el campo `datos`
function respuestasEnSnakeCase(req, res, next) {
    const jsonOriginal = res.json.bind(res);
    res.json = (cuerpo) => {
        if (esObjetoPlano(cuerpo) && 'datos' in cuerpo) {
            cuerpo = { ...cuerpo, datos: clavesASnakeCase(cuerpo.datos) };
        }
        return jsonOriginal(cuerpo);
    };
    next();
}

module.exports = { respuestasEnSnakeCase, clavesASnakeCase };
