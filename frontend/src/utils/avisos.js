import { parseFechaHora } from './displayFormat';
import { tipoEvento } from '../theme/tokens';

// Ayudas compartidas para mostrar recordatorios ("avisos") en Familia: ícono y color por tipo, color por
// integrante o mascota, y formato de cuándo.
// Sale de theme/tokens.js (tipoEvento): una sola paleta por tipo en toda la app.
export const TIPO_AVISO = Object.fromEntries(
  Object.entries(tipoEvento).map(([k, t]) => [k, { label: t.etiqueta, icon: t.icono, fg: t.marca, bg: t.fondo, texto: t.texto }])
);
export const tipoDeAviso = (t) => TIPO_AVISO[t] || TIPO_AVISO.control;

// Un color estable por persona o mascota (no depende del orden de la lista).
const PALETA = ['#C24623', '#4A6B5D', '#B07A1E', '#4F7A8C', '#8A5A7A', '#6B7A3A'];
export function colorDeMiembro(clase, id) {
  const base = clase === 'mascota' ? 3 : 0;
  return PALETA[(Number(id) + base) % PALETA.length];
}

// Pendientes, con la fecha ya convertida a Date local y ordenados por fecha. Con { todos: true } incluye también
// los ya marcados (dados / no se dio), que «Hoy» necesita para mostrarlos y poder deshacer.
export function prepararAvisos(datos, { todos = false } = {}) {
  return datos
    .filter((r) => todos || r.activo)
    .map((r) => ({ ...r, fecha: parseFechaHora(r.fecha_hora) }))
    .filter((r) => r.fecha && !Number.isNaN(r.fecha.getTime()))
    .sort((a, b) => a.fecha - b.fecha);
}

export function inicioDeDia(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function finDeDia(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
export const mismoDia = (a, b) => inicioDeDia(a).getTime() === inicioDeDia(b).getTime();

export const formatoHora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
export const formatoDiaCorto = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric' });

// "22:00" si es hoy; "jue 3 · 10:00" si es otro día.
export function cuando(fecha) {
  const hora = formatoHora.format(fecha);
  if (mismoDia(fecha, new Date())) return hora;
  return `${formatoDiaCorto.format(fecha)} · ${hora}`;
}

// Dueño de un aviso: { clase: 'integrante' | 'mascota', id } o null si no está asignado.
export function duenoDeAviso(aviso) {
  if (aviso.integrante_id) return { clase: 'integrante', id: aviso.integrante_id };
  if (aviso.mascota_id) return { clase: 'mascota', id: aviso.mascota_id };
  return null;
}
