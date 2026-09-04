// Helpers de sólo-presentación — no tocan cómo se capturan/envían los datos
// (eso sigue en DatePickerField.js), sólo cómo se muestran valores que ya
// vinieron del backend.

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Parsea cualquier valor de sólo-fecha (una columna MySQL DATE) a un Date
// local, sin importar si llegó como 'AAAA-MM-DD' suelto o como ISO completo
// con sufijo de hora/Z (mysql2 sin dateStrings:true serializa columnas DATE
// vía Date->toISOString(), que agrega una medianoche-UTC que no tiene
// significado real para un valor de sólo fecha). Siempre extrae sólo el
// prefijo AAAA-MM-DD y arma el Date con el constructor local — nunca le pasa
// el string crudo a `new Date(str)`.
//
// Por qué esto reemplaza el branching anterior (bare vs. ISO, cada uno
// parseado distinto): la versión previa asumía que "new Date(str) + getters
// locales" deshacía la conversión de mysql2 sin importar el huso horario —
// eso sólo es cierto si el huso del cliente coincide con el del servidor que
// serializó (mysql2 usa 'timezone: local' del SERVIDOR al construir la
// medianoche original). En un dispositivo con huso distinto al del backend
// (confirmado: este entorno de desarrollo corre en America/Buenos_Aires,
// UTC-3, igual que el backend — por eso el bug no se veía acá), esa lectura
// corre la fecha un día. Tomar sólo los dígitos AAAA-MM-DD e ignorar
// cualquier sufijo de hora/offset es independiente del huso de ambos lados.
export function parseApiDate(str) {
  if (!str) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  return new Date(y, m - 1, d);
}

// Cualquier string de fecha-sólo-día (bare o ISO con sufijo — ver
// parseApiDate) pasa por ahí. Un Date ya armado se usa tal cual, sin volver
// a parsear.
export function formatLongDate(input) {
  if (!input) return '';
  const date = input instanceof Date ? input : parseApiDate(input);
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`;
}

// Parsea fecha_hora (columna MySQL DATETIME, a diferencia de parseApiDate
// arriba que es sólo para columnas DATE) a un Date local. A diferencia de
// parseApiDate, acá el sufijo de hora/zona SÍ importa — un DATETIME
// representa un instante real, no un día sin hora.
//
// Verificado en vivo contra el backend (mysql2 sin dateStrings:true,
// timezone:'local' del server = America/Buenos_Aires): un recordatorio
// guardado como '2026-09-04 18:00:00' se lee de vuelta por GET
// /api/recordatorios como '2026-09-04T21:00:00.000Z' (el driver arma el Date
// correcto internamente — esa instancia SÍ son las 18:00 ART — pero
// JSON.stringify lo serializa vía toISOString(), que es UTC). Si se extraen
// los dígitos de esa string ISO y se reconstruyen con el constructor local
// (como hacía la versión anterior de esta función, y su copia duplicada en
// utils/notifications.js), se leen "21:00" como si ya fueran hora local —
// resultado: se muestra/programa 3 horas tarde, exactamente el offset UTC
// real del servidor. Por eso acá, a diferencia de parseApiDate, un sufijo
// 'Z'/offset se delega a `new Date(str)` (parseo ISO nativo, hace la
// conversión UTC→local correctamente) en vez de ignorarse. Sólo el formato
// bare sin sufijo de zona (que ni siquiera es el que este endpoint envía
// hoy — ver nota abajo) se arma a mano desde los dígitos, porque ahí no hay
// zona que convertir: son valores locales ya tal cual.
export function parseFechaHora(str) {
  if (!str) return null;
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(str)) {
    return new Date(str);
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(str);
  if (match) {
    const [, y, mo, d, h, mi, s] = match.map(Number);
    return new Date(y, mo - 1, d, h, mi, s);
  }
  return new Date(str);
}

// Sólo para mostrar — no altera el valor guardado. Normaliza cualquier
// combinación de mayúsculas ("aNTIRRABICA") a formato oración.
export function toSentenceCase(text) {
  if (!text) return '';
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
