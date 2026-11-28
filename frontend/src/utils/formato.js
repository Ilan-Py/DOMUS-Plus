// Detalles de texto que hacen que la interfaz se lea como escrita por una persona: plurales correctos, fechas
// relativas («mañana», «hace 3 días») y fechas sin ambigüedad («martes 24/11», nunca «mar 24»).
import { inicioDeDia } from './avisos';
import { parseApiDate } from './displayFormat';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// plural(1, 'integrante') → «1 integrante» · plural(2, 'dosis', 'dosis') → «2 dosis» · plural(3, 'turno') → «3 turnos»
export function plural(n, singular, pluralForma) {
  const forma = n === 1 ? singular : pluralForma || `${singular}s`;
  return `${n} ${forma}`;
}

// Días de diferencia entre dos fechas, por día calendario (no por 24 h).
export function diasEntre(desde, hasta) {
  return Math.round((inicioDeDia(hasta) - inicioDeDia(desde)) / 86400000);
}

// «hoy», «mañana», «ayer», «en 3 días», «hace 3 días», «en 2 semanas», «hace 1 mes»…
export function fechaRelativa(fecha, ahora = new Date()) {
  const d = diasEntre(ahora, fecha);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  const n = Math.abs(d);
  let cuanto;
  if (n < 14) cuanto = plural(n, 'día');
  else if (n < 60) cuanto = plural(Math.round(n / 7), 'semana');
  else cuanto = plural(Math.round(n / 30), 'mes', 'meses');
  return d > 0 ? `en ${cuanto}` : `hace ${cuanto}`;
}

// «martes 24/11» (y el año si no es el actual). Sin abreviaturas que se confundan con meses.
export function fechaCorta(fecha, ahora = new Date()) {
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear() !== ahora.getFullYear() ? `/${fecha.getFullYear()}` : '';
  return `${DIAS[fecha.getDay()]} ${dd}/${mm}${anio}`;
}

// «viernes 27 de noviembre»
export function fechaLarga(fecha) {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

// Edad en años cumplidos a partir de la fecha de nacimiento de la API («1946-03-02»). null si no hay fecha.
export function edadDe(fechaNacimiento) {
  const nacimiento = parseApiDate(fechaNacimiento);
  if (!nacimiento) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const cumplio =
    hoy.getMonth() > nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate());
  if (!cumplio) edad -= 1;
  return edad >= 0 ? edad : null;
}

export function hora(fecha) {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

// Cuándo es un evento, para mostrar al lado del título:
//   hoy → «08:00» · mañana → «mañana 10:00» · esta semana → «lunes 30/11 · 18:00»
//   pasado → «martes 24/11 · 08:00 · hace 3 días»
export function cuandoEvento(fecha, { todoElDia = false, ahora = new Date() } = {}) {
  const h = todoElDia ? 'todo el día' : hora(fecha);
  const d = diasEntre(ahora, fecha);
  if (d === 0) return todoElDia ? 'Hoy, todo el día' : h;
  if (d === 1) return `mañana ${h}`;
  if (d === -1) return `ayer ${h}`;
  const base = `${fechaCorta(fecha, ahora)} · ${h}`;
  return d < 0 ? `${base} · ${fechaRelativa(fecha, ahora)}` : base;
}
