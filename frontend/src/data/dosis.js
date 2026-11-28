import api from '../api/client';
import { mostrarToast } from '../components/ToastHost';
import { hora, fechaCorta } from '../utils/formato';
import { inicioDeDia, finDeDia, mismoDia } from '../utils/avisos';

// Marca de dosis, turnos y vacunas programadas (docs/ux/03-definicion.md §2, docs/ux/05-copy.md §4.1).
// Un solo lugar para Hoy (Familia) y el Calendario: mismas reglas, mismos textos.
//
//   estado de la API: 'pendiente' | 'hecho' | 'omitido'
//   estado para mostrar (tokens.estadoDosis): 'pendiente' | 'sin_marcar' | 'dada' | 'no_se_dio' | 'futura'

const MIN = 60 * 1000;
const MARGEN_PROXIMA = 2 * 60 * MIN; // no pasar una dosis a menos de 2 h de la siguiente de su serie (DOS-01)

// Cómo se muestra un recordatorio ahora.
export function estadoParaMostrar(r, ahora = new Date()) {
  if (r.estado === 'hecho' || (!r.estado && r.activo === false)) return 'dada';
  if (r.estado === 'omitido') return 'no_se_dio';
  if (r.fecha < ahora) return 'sin_marcar';
  return mismoDia(r.fecha, ahora) ? 'pendiente' : 'futura';
}

// Palabra de la marca según el tipo: una dosis «se da»; un turno o una vacuna «se hace» / «no fue».
export function palabras(tipo) {
  if (tipo === 'medicacion') return { hecho: 'Dada', omitido: 'No se dio', accion: 'Marcar como dada', pregunta: '¿Se la dieron?', si: 'Sí, se la dieron' };
  if (tipo === 'vacuna') return { hecho: 'Aplicada', omitido: 'No se aplicó', accion: 'Marcar como aplicada', pregunta: '¿Se la aplicaron?', si: 'Sí, se aplicó' };
  return { hecho: 'Fue', omitido: 'No fue', accion: 'Marcar que fue', pregunta: '¿Fue al turno?', si: 'Sí, fue' };
}

// «Dada 08:12 · Mónica» / «Dada · marcada el sábado 28/11» / «No se dio · Mónica»
export function detalleDeMarca(r) {
  const p = palabras(r.tipo);
  const quien = r.marcado_por?.nombre ? ` · ${r.marcado_por.nombre}` : '';
  if (r.estado === 'omitido') return `${p.omitido}${quien}`;
  if (r.estado !== 'hecho' && r.activo !== false) return null;
  if (!r.hecho_a) return `${p.hecho}${quien}`;
  const cuando = new Date(r.hecho_a);
  if (r.fecha && !mismoDia(cuando, r.fecha)) return `${p.hecho} · marcada el ${fechaCorta(cuando)}${quien}`;
  return `${p.hecho} ${hora(cuando)}${quien}`;
}

function titulo(r, persona) {
  const que = r.descripcion || (r.tipo === 'medicacion' ? 'La dosis' : r.tipo === 'vacuna' ? 'La vacuna' : 'El turno');
  return persona?.nombre && !que.includes(persona.nombre) ? `${que} de ${persona.nombre}` : que;
}

function errorDeMarca(err) {
  mostrarToast(err?.status ? err.mensaje : 'No pudimos guardar la marca. Revisá la conexión y probá de nuevo.', 'error');
}

// Marca hecho u omitido con «Deshacer» en el toast. `alCambiar(id, cambios | null)` actualiza la lista en el acto
// (null = volver al estado de antes); `recargar` trae la versión del servidor después de deshacer.
// opciones.hechoA: cuándo pasó (por defecto, ahora; para «a horario» se pasa la fecha programada).
export async function marcar(r, estado, { persona, hechoA, alCambiar, recargar, usuario } = {}) {
  const p = palabras(r.tipo);
  const cambios = {
    estado,
    activo: false,
    hecho_a: (hechoA || new Date()).toISOString(),
    marcado_por: usuario ? { id: usuario.id, nombre: usuario.nombre } : null,
  };
  alCambiar?.(r.id, cambios);
  try {
    await api.patch(`/api/recordatorios/${r.id}/marcar`, { estado, ...(hechoA ? { hecho_a: hechoA.toISOString() } : null) });
  } catch (err) {
    alCambiar?.(r.id, null);
    errorDeMarca(err);
    return false;
  }
  const que = titulo(r, persona);
  const texto =
    estado === 'hecho'
      ? `${que}: ${p.hecho.toLowerCase()}${r.tipo === 'medicacion' ? ` a las ${hora(hechoA || new Date())}` : ''}`
      : `Anotamos que ${p.omitido.charAt(0).toLowerCase()}${p.omitido.slice(1)}: ${que}`;
  mostrarToast(texto, {
    accion: {
      etiqueta: 'Deshacer',
      onPress: async () => {
        alCambiar?.(r.id, { estado: 'pendiente', activo: true, hecho_a: null, marcado_por: null });
        try {
          await api.patch(`/api/recordatorios/${r.id}/reactivar`);
          mostrarToast('Listo, quedó sin marcar');
        } catch (err) {
          alCambiar?.(r.id, cambios);
          errorDeMarca(err);
        }
        recargar?.();
      },
    },
  });
  return true;
}

// Hasta qué hora se puede pasar una dosis de hoy: una hora más tarde (redondeado al cuarto de hora siguiente),
// sin cruzar la medianoche ni quedar a menos de 2 h de la próxima de su serie. null = no se puede pasar.
export function horaParaPasar(r, todos = [], ahora = new Date()) {
  if (r.tipo !== 'medicacion') return null; // un turno o una vacuna no se «pasan una hora»: se editan
  if (!mismoDia(r.fecha, ahora) && r.fecha < ahora) return null; // los de otros días se marcan, no se pasan
  const base = new Date(Math.max(ahora.getTime(), r.fecha.getTime()) + 60 * MIN);
  const cuarto = 15 * MIN;
  const nueva = new Date(Math.ceil(base.getTime() / cuarto) * cuarto);
  nueva.setSeconds(0, 0);
  if (nueva > finDeDia(r.fecha)) return null;
  if (r.serie_id) {
    const proxima = todos
      .filter((x) => x.serie_id === r.serie_id && x.id !== r.id && x.fecha > r.fecha)
      .sort((a, b) => a.fecha - b.fecha)[0];
    if (proxima && nueva.getTime() > proxima.fecha.getTime() - MARGEN_PROXIMA) return null;
  }
  return nueva;
}

// Pasa una dosis a otra hora del mismo día. Sin «Deshacer»: volver a la hora original (ya pasada) no se puede
// guardar (la API sólo acepta horas futuras) y la persona puede volver a pasarla o marcarla.
export async function pasar(r, nueva, { recargar } = {}) {
  try {
    await api.patch(`/api/recordatorios/${r.id}`, {
      tipo: r.tipo,
      fecha_hora: nueva.toISOString(),
      descripcion: r.descripcion || undefined,
    });
    mostrarToast(`La pasamos a las ${hora(nueva)}`);
    await recargar?.();
    return true;
  } catch (err) {
    mostrarToast(err?.status ? err.mensaje : 'No pudimos cambiar la hora. Revisá la conexión y probá de nuevo.', 'error');
    return false;
  }
}

// Separa los pendientes para «Hoy»: los de hoy y los que quedaron sin marcar de días anteriores (DOS-06).
export function separarHoy(avisos, ahora = new Date()) {
  const hoy0 = inicioDeDia(ahora);
  const hoy1 = finDeDia(ahora);
  const pendientes = (avisos || []).filter((a) => estadoParaMostrar(a, ahora) === 'pendiente' || estadoParaMostrar(a, ahora) === 'sin_marcar');
  return {
    hoy: pendientes.filter((a) => a.fecha >= hoy0 && a.fecha <= hoy1),
    atrasados: pendientes.filter((a) => a.fecha < hoy0),
    // Lo de hoy que ya se marcó: queda a la vista (tachado o con su ✓) para poder deshacer y para saber que se hizo.
    marcadosHoy: (avisos || []).filter((a) => a.fecha >= hoy0 && a.fecha <= hoy1 && ['dada', 'no_se_dio'].includes(estadoParaMostrar(a, ahora))),
  };
}
