//1 — Validaciones comunes de entrada (ERR-011)
// Cada controller sigue chequeando sus campos obligatorios con sus propios
// mensajes. Esto agrega lo que faltaba: que cada campo que SÍ viene tenga el
// tipo, el formato y el largo correctos ANTES de llegar a Prisma. Sin esto, un
// id "abc", una fecha "2026-13-45", un texto de 600 caracteres o un número en
// vez de un texto terminaban en un 500 (o tiraban abajo el servidor).

const ID_MAXIMO = 2147483647; // máximo de una columna Int de Postgres

//2 — Id entero positivo. Acepta 5 o "5"; rechaza "abc", "1.5", "-1", "0", "5a".
function esIdValido(valor) {
    if (typeof valor === 'number') return Number.isInteger(valor) && valor > 0 && valor <= ID_MAXIMO;
    if (typeof valor === 'string' && /^\d+$/.test(valor)) {
        const numero = Number(valor);
        return numero > 0 && numero <= ID_MAXIMO;
    }
    return false;
}

//3 — Fecha "AAAA-MM-DD" (con o sin hora después) que exista en el calendario.
// new Date('2026-02-31') no siempre falla, por eso se arma la fecha con los
// números y se comprueba que no se haya corrido al mes siguiente.
const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function esFechaValida(valor) {
    if (typeof valor !== 'string') return false;
    const partes = PATRON_FECHA.exec(valor.trim());
    if (!partes) return false;
    const [, anio, mes, dia, hora = '0', minuto = '0', segundo = '0'] = partes;
    const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
    const existeElDia = fecha.getFullYear() === Number(anio)
        && fecha.getMonth() === Number(mes) - 1
        && fecha.getDate() === Number(dia);
    const horaValida = Number(hora) <= 23 && Number(minuto) <= 59 && Number(segundo) <= 59;
    return existeElDia && horaValida;
}

const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ERR-008: nombres y apellidos de personas — letras (con tildes, ñ, ü), espacios,
// apóstrofes y guiones. Tiene que empezar con una letra. Sin números ni símbolos.
const PATRON_NOMBRE_PERSONA = /^\p{L}[\p{L}\p{M}\s'’-]*$/u;

//4 — Valida los campos de `origen` (req.body o req.query) según `reglas`.
// Sólo revisa los campos que vienen con valor: los obligatorios los sigue
// chequeando cada controller. Devuelve el primer mensaje de error, o null.
//
// Reglas: { campo: { tipo, etiqueta?, max?, valores? } }
//   tipo 'texto'     → string, con largo máximo `max`
//   tipo 'email'     → texto con formato de email
//   tipo 'nombrePersona' → texto con sólo letras, espacios, apóstrofes y guiones
//   tipo 'fecha'     → "AAAA-MM-DD"
//   tipo 'fechaHora' → "AAAA-MM-DD HH:mm[:ss]" (o ISO)
//   tipo 'id'        → entero positivo
//   tipo 'enum'      → uno de `valores`
function validarCampos(origen, reglas) {
    const datos = origen || {};
    for (const [campo, regla] of Object.entries(reglas)) {
        const valor = datos[campo];
        if (valor === undefined || valor === null || valor === '') continue;
        const etiqueta = regla.etiqueta || campo.replace(/_/g, ' ');

        switch (regla.tipo) {
            case 'texto':
            case 'email':
            case 'nombrePersona':
                if (typeof valor !== 'string') return `El campo ${etiqueta} debe ser texto.`;
                if (regla.max && valor.trim().length > regla.max) {
                    return `El campo ${etiqueta} admite como máximo ${regla.max} caracteres.`;
                }
                if (regla.tipo === 'email' && !PATRON_EMAIL.test(valor.trim())) {
                    return 'El email no tiene un formato válido.';
                }
                if (regla.tipo === 'nombrePersona') {
                    if (!valor.trim()) return `El campo ${etiqueta} no puede estar vacío.`;
                    if (!PATRON_NOMBRE_PERSONA.test(valor.trim())) {
                        return `El campo ${etiqueta} sólo puede tener letras, espacios, apóstrofes y guiones.`;
                    }
                }
                break;
            case 'fecha':
                if (!esFechaValida(valor)) return `El campo ${etiqueta} no es una fecha válida (formato AAAA-MM-DD).`;
                break;
            case 'fechaHora':
                if (!esFechaValida(valor)) return `El campo ${etiqueta} no es una fecha y hora válida.`;
                break;
            case 'id':
                if (!esIdValido(valor)) return `El campo ${etiqueta} debe ser un número entero positivo.`;
                break;
            case 'enum':
                if (!regla.valores.includes(valor)) return `El campo ${etiqueta} debe ser uno de: ${regla.valores.join(', ')}.`;
                break;
            default:
                throw new Error(`Regla de validación desconocida: ${regla.tipo}`);
        }
    }
    return null;
}

//5 — Para router.param: rechaza con 400 cualquier :id de la URL que no sea
// un entero positivo, antes de que llegue al controller.
function validarIdDeRuta(req, res, next, valor) {
    if (!esIdValido(valor)) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'El id de la URL debe ser un número entero positivo.' });
    }
    next();
}

module.exports = { esIdValido, esFechaValida, validarCampos, validarIdDeRuta };
