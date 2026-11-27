// Reglas de fechas razonables para los formularios. Cada validador devuelve un
// mensaje de error (string) o '' si la fecha está bien. Evitan datos absurdos
// como una vacuna aplicada en el año 1099 o una persona de 713 años.
//
// Los rangos (`rango*`) se usan también como min/max de los selectores de fecha,
// para que ni siquiera se puedan elegir esas fechas.

export const FECHA_MINIMA = new Date(1900, 0, 1);

function hoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function sumarAnios(fecha, anios) {
  return new Date(fecha.getFullYear() + anios, fecha.getMonth(), fecha.getDate());
}

function diaSiguiente(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
}

const anterior1900 = (f) => f < FECHA_MINIMA;

// ---- Nacimiento: entre 1900 y hoy
export const rangoNacimiento = () => ({ min: FECHA_MINIMA, max: hoy() });
export function validarNacimiento(f) {
  if (anterior1900(f)) return 'La fecha de nacimiento no puede ser anterior a 1900.';
  if (f > hoy()) return 'La fecha de nacimiento no puede ser futura.';
  return '';
}

// ---- Vacuna: aplicada entre 1900 y hoy; próxima dosis después, hasta 10 años adelante
export const rangoAplicacion = () => ({ min: FECHA_MINIMA, max: hoy() });
export function validarAplicacion(f) {
  if (anterior1900(f)) return 'La fecha de aplicación no puede ser anterior a 1900.';
  if (f > hoy()) return 'La fecha de aplicación no puede ser futura.';
  return '';
}
export const rangoProximaDosis = (aplicacion) => ({
  min: aplicacion ? diaSiguiente(aplicacion) : FECHA_MINIMA,
  max: sumarAnios(hoy(), 10),
});
export function validarProximaDosis(prox, aplicacion) {
  if (aplicacion && prox <= aplicacion) return 'La próxima dosis debe ser posterior a la fecha de aplicación.';
  if (prox > sumarAnios(hoy(), 10)) return 'La próxima dosis no puede estar a más de 10 años.';
  return '';
}

// ---- Tratamiento: inicio entre 1900 y un año adelante; fin después del inicio, hasta 10 años
export const rangoInicioTratamiento = () => ({ min: FECHA_MINIMA, max: sumarAnios(hoy(), 1) });
export function validarInicioTratamiento(f) {
  if (anterior1900(f)) return 'La fecha de inicio no puede ser anterior a 1900.';
  if (f > sumarAnios(hoy(), 1)) return 'La fecha de inicio no puede estar a más de un año.';
  return '';
}
export const rangoFinTratamiento = (inicio) => ({
  min: inicio || FECHA_MINIMA,
  max: inicio ? sumarAnios(inicio, 10) : sumarAnios(hoy(), 11),
});
export function validarFinTratamiento(fin, inicio) {
  if (inicio && fin < inicio) return 'La fecha de fin no puede ser anterior a la fecha de inicio.';
  if (inicio && fin > sumarAnios(inicio, 10)) return 'El tratamiento no puede durar más de 10 años.';
  return '';
}

// ---- Recordatorio: futuro, hasta 5 años adelante
export const rangoRecordatorio = () => ({ min: hoy(), max: sumarAnios(hoy(), 5) });
export function validarFechaRecordatorio(f) {
  if (f > sumarAnios(hoy(), 5)) return 'El recordatorio no puede ser a más de 5 años.';
  return '';
}
