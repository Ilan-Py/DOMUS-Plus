import React, { useCallback, useMemo, useRef, useState } from 'react';
import { mostrarToast } from '../components/ToastHost';
import { useAuth } from '../context/AuthContext';
import { marcar, estadoParaMostrar, palabras, detalleDeMarca } from '../data/dosis';
import { plural, fechaCorta, hora as horaDe } from '../utils/formato';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import { paper } from '../theme/paper';
import api, { getList } from '../api/client';
import { useFamily } from '../context/FamilyContext';
import ErrorBanner from '../components/ErrorBanner';
import InlineError from '../components/InlineError';
import PrimaryButton from '../components/PrimaryButton';
import PressScale from '../components/PressScale';
import Skeleton from '../components/Skeleton';
import MiniCalendar, { dayKey, NOMBRE_MES } from '../components/MiniCalendar';
import PaperCard from '../components/PaperCard';
import Evento from '../components/Evento';
import EntityAvatar from '../components/EntityAvatar';
import { VistaSemana, VistaLista } from '../components/CalendarioVistas';
import { TIPO_AVISO, tipoDeAviso, mismoDia, inicioDeDia } from '../utils/avisos';
import { entregarTexto } from '../utils/resumenFichas';
import PaperCutout from '../components/PaperCutout';
import Pulse from '../components/Pulse';
import { cancelarNotificacion, sincronizarNotificaciones } from '../utils/notifications';
import { parseFechaHora } from '../utils/displayFormat';
import { confirmarDestructivo, elegirOpcion } from '../utils/confirm';
import FadeSlideIn from '../components/FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from '../components/FadeOutRow';

// Layout: desde 1024 px, grilla mensual a la izquierda (~65 %) y "Agenda del día" a la derecha
// (~35 %), en un contenedor de hasta 1180 px alineado a la izquierda. Debajo, apilados.
const DESKTOP_BREAKPOINT = 1024;
const CONTAINER_MAX_WIDTH = 1440;

// Nombres de días y meses desde Intl (es-AR) en vez de listas fijas: 7 de enero de 2024 fue domingo.
const fmtDia = new Intl.DateTimeFormat('es-AR', { weekday: 'long' });
const fmtMes = new Intl.DateTimeFormat('es-AR', { month: 'long' });
const DIAS = Array.from({ length: 7 }, (_, i) => {
  const n = fmtDia.format(new Date(2024, 0, 7 + i));
  return n.charAt(0).toUpperCase() + n.slice(1);
});
const MESES = Array.from({ length: 12 }, (_, i) => fmtMes.format(new Date(2024, i, 1)));
const TIPO_LABELS = { vacuna: 'Vacuna', control: 'Control', medicacion: 'Medicación' };

const FILTROS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Personas', value: 'personas' },
  { label: 'Mascotas', value: 'mascotas' },
];

function formatSectionTitle(fecha) {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

function formatHora(fecha) {
  const h = String(fecha.getHours()).padStart(2, '0');
  const m = String(fecha.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function SkeletonReminderRow() {
  return (
    <View style={styles.card}>
      <Skeleton width={90} height={22} borderRadius={999} />
      <Skeleton width="70%" height={16} style={{ marginTop: 12 }} />
    </View>
  );
}

export default function CalendarScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= DESKTOP_BREAKPOINT;
  const { integrantes, mascotas } = useFamily();
  const { usuario } = useAuth();

  const [recordatorios, setRecordatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState('');
  const [dismissingId, setDismissingId] = useState(null);
  // Fila que ya confirmó desactivar/eliminar en el backend y está en su
  // animación de salida (FadeOutRow).
  const [exitingId, setExitingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  // Vista (mes / semana / lista): en pantallas angostas arranca en lista.
  const [vista, setVista] = useState(() => (width < 768 ? 'lista' : 'mes'));
  const [miembro, setMiembro] = useState(null); // { clase, id }
  const [tipoFiltro, setTipoFiltro] = useState(null); // 'medicacion' | 'vacuna' | 'control'
  // Siempre hay un día elegido (por defecto, hoy): la agenda de la derecha muestra ese día.
  const [diaElegido, setDiaElegido] = useState(() => dayKey(new Date()));
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  // Desde la tira semanal de Familia llega `dia` (clave AAAA-MM-DD): se abre el calendario en ese día.
  const diaParam = route?.params?.dia;
  React.useEffect(() => {
    if (!diaParam) return;
    const [a, m, d] = String(diaParam).split('-').map(Number);
    if (!a || Number.isNaN(m) || !d) return;
    setDiaElegido(diaParam);
    setMes(new Date(a, m, 1)); // dayKey usa el mes base 0
  }, [diaParam]);
  // De quién es cada recordatorio: se deduce de la vacuna/tratamiento al que
  // está vinculado (la API no guarda el dueño en el recordatorio en sí).
  const [duenos, setDuenos] = useState({});

  const hasLoadedOnceRef = useRef(false);

  const cargarDuenos = useCallback(
    async (datos) => {
      if (!datos.some((r) => r.vacuna_id || r.tratamiento_id)) {
        setDuenos({});
        return;
      }
      const miembros = [
        ...integrantes.map((m) => ({ nombre: m.nombre, params: { integrante_id: m.id } })),
        ...mascotas.map((m) => ({ nombre: m.nombre, params: { mascota_id: m.id } })),
      ];
      const mapa = {};
      try {
        await Promise.all(
          miembros.map(async (m) => {
            const [vacunas, tratamientos] = await Promise.all([
              getList('/api/salud/vacunas', { params: m.params }),
              getList('/api/salud/tratamientos', { params: m.params }),
            ]);
            vacunas.forEach((v) => (mapa[`v-${v.id}`] = m.nombre));
            tratamientos.forEach((t) => (mapa[`t-${t.id}`] = m.nombre));
          })
        );
      } catch {
        // Sin el nombre igual se ve el recordatorio; sólo falta la etiqueta.
      }
      setDuenos(mapa);
    },
    [integrantes, mascotas]
  );

  const fetchRecordatorios = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setLoading(true);
    setLoadError(false);
    try {
      const datos = await getList('/api/recordatorios');
      setRecordatorios(datos);
      hasLoadedOnceRef.current = true;
      // Fire-and-forget: programa en este dispositivo los recordatorios que
      // creó otro integrante del grupo (ver utils/notifications.js).
      sincronizarNotificaciones(datos).catch(() => {});
      cargarDuenos(datos);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [cargarDuenos]);

  useFocusEffect(
    useCallback(() => {
      fetchRecordatorios();
    }, [fetchRecordatorios])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchRecordatorios();
    setRefreshing(false);
  }

  // Interfaz optimista (Doherty < 400 ms): la fila empieza a salir en el acto, mientras el pedido
  // viaja al servidor en paralelo. Si el servidor falla, la fila vuelve y se muestra el error —
  // no se le miente a la persona sobre lo que quedó guardado.
  async function salirOptimista(id, pedido) {
    setActionError('');
    setDismissingId(id);
    setExitingId(id);
    const [resultado] = await Promise.allSettled([
      pedido(),
      new Promise((resolve) => setTimeout(resolve, EXIT_DURATION)),
    ]);
    if (resultado.status === 'rejected') {
      setActionError(resultado.reason?.mensaje || 'No pudimos guardar el cambio. Probá de nuevo.');
      setExitingId(null);
      setDismissingId(null);
      return false;
    }
    await cancelarNotificacion(id);
    await fetchRecordatorios();
    setExitingId(null);
    setDismissingId(null);
    return true;
  }

  // Marca en el acto (interfaz optimista) y vuelve atrás si el servidor falla. `cambios === null` = como estaba.
  const antesDeMarcar = useRef({});
  const actualizarMarca = useCallback((id, cambios) => {
    setRecordatorios((lista) =>
      lista.map((r) => {
        if (r.id !== id) return r;
        if (cambios === null) {
          const antes = antesDeMarcar.current[id];
          delete antesDeMarcar.current[id];
          return antes || r;
        }
        if (!antesDeMarcar.current[id]) antesDeMarcar.current[id] = r;
        return { ...r, ...cambios };
      })
    );
  }, []);

  async function marcarEvento(e, estado, hechoA) {
    if (dismissingId) return;
    setDismissingId(e.item.id);
    setActionError('');
    const ok = await marcar({ ...e.item, fecha: e.fecha }, estado, {
      persona: e.dueno,
      hechoA,
      alCambiar: actualizarMarca,
      recargar: fetchRecordatorios,
      usuario,
    });
    if (ok) cancelarNotificacion(e.item.id).catch(() => {});
    setDismissingId(null);
  }

  function handleEditar(item) {
    navigation.navigate('AddReminder', { editando: item });
  }

  async function handleEliminar(id, alcance) {
    await salirOptimista(id, () => api.delete(`/api/recordatorios/${id}${alcance === 'siguientes' ? '?alcance=siguientes' : ''}`));
  }

  function confirmEliminar(item) {
    // Un recordatorio de una serie pregunta si se borra sólo ese o también los que siguen.
    if (item.serie_id) {
      elegirOpcion(
        'Eliminar recordatorio repetido',
        [
          { text: 'Solo este', value: 'este' },
          { text: 'Este y los siguientes', value: 'siguientes' },
        ],
        (alcance) => handleEliminar(item.id, alcance)
      );
      return;
    }
    confirmarDestructivo(
      'Eliminar recordatorio',
      `¿Seguro que querés eliminar este recordatorio${item.descripcion ? ` ("${item.descripcion}")` : ''}?`,
      () => handleEliminar(item.id)
    );
  }

  function handleLongPress(item) {
    if (dismissingId) return;
    confirmEliminar(item);
  }

  const nuevo = () => navigation.navigate('AddReminder');

  // De quién es el recordatorio: el integrante/mascota guardado; si no, el dueño de
  // la vacuna o tratamiento al que está vinculado.
  function duenoDe(item) {
    if (item.integrante_id) return integrantes.find((m) => m.id === item.integrante_id)?.nombre;
    if (item.mascota_id) return mascotas.find((m) => m.id === item.mascota_id)?.nombre;
    return duenos[item.vacuna_id ? `v-${item.vacuna_id}` : `t-${item.tratamiento_id}`];
  }

  // Mascota si el recordatorio es de una mascota (directo o por la vacuna/tratamiento al que está vinculado).
  function esDeMascota(item) {
    if (item.mascota_id) return true;
    if (item.integrante_id) return false;
    const nombre = duenoDe(item);
    return !!nombre && mascotas.some((m) => m.nombre === nombre) && !integrantes.some((m) => m.nombre === nombre);
  }
  // Quién es el dueño del recordatorio, para el avatar (directo o por la vacuna/tratamiento vinculado).
  function duenoInfo(item) {
    let m = null;
    let clase = 'integrante';
    if (item.integrante_id) m = integrantes.find((x) => x.id === item.integrante_id);
    else if (item.mascota_id) {
      m = mascotas.find((x) => x.id === item.mascota_id);
      clase = 'mascota';
    } else {
      const n = duenos[item.vacuna_id ? `v-${item.vacuna_id}` : `t-${item.tratamiento_id}`];
      m = integrantes.find((x) => x.nombre === n);
      if (!m) {
        m = mascotas.find((x) => x.nombre === n);
        clase = 'mascota';
      }
    }
    return m ? { nombre: m.nombre, apellido: m.apellido, avatarId: m.avatar_id, clase, id: m.id } : null;
  }

  // Filtros combinados: grupo (todos/personas/mascotas), integrante o mascota puntual y tipo de aviso.
  const porQuien = useMemo(
    () =>
      recordatorios.filter((r) => {
        if (filtro === 'mascotas' && !esDeMascota(r)) return false;
        if (filtro === 'personas' && esDeMascota(r)) return false;
        if (tipoFiltro && r.tipo !== tipoFiltro) return false;
        if (miembro) {
          const d = duenoInfo(r);
          if (!d || d.clase !== miembro.clase || d.id !== miembro.id) return false;
        }
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recordatorios, filtro, tipoFiltro, miembro, integrantes, mascotas, duenos]
  );
  const evs = useMemo(() => {
    const ahora = new Date();
    return porQuien
      .map((r) => {
        const fecha = parseFechaHora(r.fecha_hora);
        const estado = estadoParaMostrar({ ...r, fecha }, ahora);
        return {
          item: r,
          fecha,
          estado,
          hecho: estado === 'dada',
          omitido: estado === 'no_se_dio',
          vencido: estado === 'sin_marcar',
          dueno: duenoInfo(r),
        };
      })
      .sort((a, b) => a.fecha - b.fecha);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porQuien, integrantes, mascotas, duenos]);

  // día -> eventos de ese día (puntos, chips y adherencia de la grilla)
  const marcados = useMemo(() => {
    const mapa = new Map();
    evs.forEach((e) => {
      const k = dayKey(e.fecha);
      const info = mapa.get(k) || { eventos: [] };
      info.eventos.push({
        id: e.item.id,
        tipo: e.item.tipo,
        hora: formatHora(e.fecha),
        titulo: e.item.descripcion || (TIPO_AVISO[e.item.tipo] || TIPO_AVISO.control).label,
        hecho: e.hecho,
        omitido: e.omitido,
        vencido: e.vencido,
        serie: !!e.item.serie_id,
      });
      mapa.set(k, info);
    });
    return mapa;
  }, [evs]);
  const delDia = useMemo(() => evs.filter((e) => dayKey(e.fecha) === diaElegido), [evs, diaElegido]);

  // Pendientes sin marcar: avisos que ya pasaron y nadie marcó como hechos.
  const sinMarcar = useMemo(() => evs.filter((e) => e.vencido).sort((a, b) => b.fecha - a.fecha), [evs]);
  // Resumen del mes que se está viendo.
  const resumenMes = useMemo(() => {
    const delMes = evs.filter((e) => e.fecha.getMonth() === mes.getMonth() && e.fecha.getFullYear() === mes.getFullYear());
    const dosisPasadas = delMes.filter((e) => e.item.tipo === 'medicacion' && (e.hecho || e.omitido || e.vencido));
    return {
      total: delMes.length,
      dadas: dosisPasadas.filter((e) => e.hecho).length,
      pasadas: dosisPasadas.length,
      turnos: delMes.filter((e) => e.item.tipo === 'control').length,
      vacunas: delMes.filter((e) => e.item.tipo === 'vacuna').length,
    };
  }, [evs, mes]);
  // Vista lista: los últimos 7 días y los próximos 90.
  const enLista = useMemo(() => {
    const desde = inicioDeDia(new Date(Date.now() - 7 * 86400000));
    const hasta = new Date(Date.now() + 90 * 86400000);
    return evs.filter((e) => e.fecha >= desde && e.fecha <= hasta);
  }, [evs]);

  const [anio, mesNum, diaNum] = diaElegido.split('-').map(Number);
  const fechaElegida = new Date(anio, mesNum, diaNum);
  const hoy0 = new Date();
  hoy0.setHours(0, 0, 0, 0);
  const esPasado = fechaElegida < hoy0;
  const esHoyElegido = diaElegido === dayKey(new Date());

  function irAHoy() {
    const h = new Date();
    setMes(new Date(h.getFullYear(), h.getMonth(), 1));
    setDiaElegido(dayKey(h));
  }
  // Flechas: mes en la vista mensual y lista; semana en la vista semanal.
  function mover(delta) {
    if (vista === 'semana') {
      const d = new Date(fechaElegida);
      d.setDate(d.getDate() + 7 * delta);
      setDiaElegido(dayKey(d));
      setMes(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));
    }
  }
  function elegirDia(k, fecha) {
    setDiaElegido(k);
    if (fecha && (fecha.getMonth() !== mes.getMonth() || fecha.getFullYear() !== mes.getFullYear())) {
      setMes(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
    }
  }
  const agregarEn = (k) => navigation.navigate('AddReminder', { fechaInicial: k });

  // Posponer un aviso futuro un día (la API sólo pide tipo y fecha; el resto queda igual).
  async function posponer(e) {
    try {
      await api.patch(`/api/recordatorios/${e.item.id}`, {
        tipo: e.item.tipo,
        fecha_hora: new Date(e.fecha.getTime() + 86400000).toISOString(),
        descripcion: e.item.descripcion || undefined,
      });
      mostrarToast(`La pasamos a mañana a las ${horaDe(e.fecha)}`);
      await fetchRecordatorios();
    } catch (err) {
      mostrarToast(err?.status ? err.mensaje : 'No pudimos cambiar la fecha. Revisá la conexión y probá de nuevo.', 'error');
    }
  }

  // Exportar a .ics (sirve en Google Calendar, Apple Calendar y Outlook): sólo los avisos pendientes.
  function exportarIcs() {
    const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (t) => String(t).replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
    const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DOMUS+//ES', 'CALSCALE:GREGORIAN'];
    evs
      .filter((e) => !e.hecho)
      .forEach((e) => {
        lineas.push(
          'BEGIN:VEVENT',
          `UID:domus-${e.item.id}@domus.app`,
          `DTSTAMP:${utc(new Date())}`,
          `DTSTART:${utc(e.fecha)}`,
          `DTEND:${utc(new Date(e.fecha.getTime() + 30 * 60000))}`,
          `SUMMARY:${esc(e.item.descripcion || tipoDeAviso(e.item.tipo).label)}`,
          `DESCRIPTION:${esc(tipoDeAviso(e.item.tipo).label + (e.dueno ? ' - ' + e.dueno.nombre : ''))}`,
          'END:VEVENT'
        );
      });
    lineas.push('END:VCALENDAR');
    entregarTexto('domus-calendario.ics', lineas.join('\r\n'))
      .then(() => mostrarToast('Listo, descargamos el calendario (.ics)'))
      .catch(() => mostrarToast('No pudimos armar el archivo del calendario. Probá de nuevo.', 'error'));
  }
  function masAcciones() {
    const opciones = [{ text: 'Exportar calendario (.ics)', value: 'ics' }];
    if (Platform.OS === 'web') opciones.push({ text: 'Imprimir este mes', value: 'imprimir' });
    elegirOpcion('Más acciones', opciones, (v) => {
      if (v === 'ics') exportarIcs();
      else if (typeof window !== 'undefined') window.print();
    });
  }

  // Acciones de cada evento (docs/ux/05-copy.md §4.1):
  //  - marcado: su estado («Dada 08:12 · Mónica») y «Deshacer»;
  //  - de un día anterior: «Dada a las 08:00» (a horario) o «No se dio»;
  //  - de hoy: «Dada» (ahora) y, si ya pasó la hora, «No se dio»;
  //  - futuro: Pasar a mañana y Editar.
  function acciones(e) {
    const p = palabras(e.item.tipo);
    const nombre = e.item.descripcion || p.hecho;
    const ocupado = dismissingId === e.item.id;
    if (e.hecho || e.omitido) {
      return (
        <View style={styles.marcaFila}>
          <Text style={[styles.hechoTag, e.omitido && styles.omitidoTag]}>{detalleDeMarca(e.item)}</Text>
          <PressScale
            contentStyle={styles.btnTexto}
            onPress={() => marcarDeshacer(e)}
            disabled={!!dismissingId}
            accessibilityLabel={`Deshacer la marca: ${nombre}`}
          >
            <Text style={styles.btnTextoTexto}>Deshacer</Text>
          </PressScale>
        </View>
      );
    }
    const futuro = inicioDeDia(e.fecha) > hoy0;
    if (futuro) {
      return (
        <>
          <PressScale contentStyle={styles.btnSec} onPress={() => posponer(e)} accessibilityLabel={`Pasar a mañana: ${nombre}`}>
            <Text style={styles.btnSecTexto}>Pasar a mañana</Text>
          </PressScale>
          <PressScale contentStyle={styles.btnSec} onPress={() => handleEditar(e.item)} accessibilityLabel={`Editar: ${nombre}`}>
            <Text style={styles.btnSecTexto}>Editar</Text>
          </PressScale>
        </>
      );
    }
    const deOtroDia = inicioDeDia(e.fecha) < hoy0;
    const textoHecho = deOtroDia ? `${p.hecho} a las ${horaDe(e.fecha)}` : p.hecho;
    return (
      <>
        <Pulse trigger={ocupado} radio={12}>
          <PressScale
            contentStyle={styles.btnHecho}
            onPress={() => marcarEvento(e, 'hecho', deOtroDia ? e.fecha : undefined)}
            disabled={!!dismissingId}
            accessibilityLabel={`${deOtroDia ? `${p.hecho} a horario, a las ${horaDe(e.fecha)}` : p.accion}: ${nombre}`}
          >
            {ocupado ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
            <Text style={styles.btnHechoTexto}>{textoHecho}</Text>
          </PressScale>
        </Pulse>
        {e.vencido && (
          <PressScale
            contentStyle={styles.btnSec}
            onPress={() => marcarEvento(e, 'omitido')}
            disabled={!!dismissingId}
            accessibilityLabel={`${p.omitido}: ${nombre}`}
          >
            <Text style={styles.btnSecTexto}>{p.omitido}</Text>
          </PressScale>
        )}
      </>
    );
  }

  async function marcarDeshacer(e) {
    if (dismissingId) return;
    setDismissingId(e.item.id);
    actualizarMarca(e.item.id, { estado: 'pendiente', activo: true, hecho_a: null, marcado_por: null });
    try {
      await api.patch(`/api/recordatorios/${e.item.id}/reactivar`);
      mostrarToast('Listo, quedó sin marcar');
    } catch (err) {
      actualizarMarca(e.item.id, null);
      mostrarToast(err?.status ? err.mensaje : 'No pudimos deshacer la marca. Revisá la conexión y probá de nuevo.', 'error');
    }
    setDismissingId(null);
    fetchRecordatorios();
  }

  const fila = (e, i, conDia) => (
    <FadeSlideIn key={e.item.id} index={i}>
      <FadeOutRow exiting={exitingId === e.item.id}>
        <Evento item={e.item} fecha={e.fecha} dueno={e.dueno} hecho={e.hecho} vencido={e.vencido} mostrarDia={conDia} onPress={() => handleEditar(e.item)}>
          {acciones(e)}
        </Evento>
      </FadeOutRow>
    </FadeSlideIn>
  );

  // ---------------- bloques ----------------
  const header = (
    <View style={[styles.header, !desktop && styles.headerMobile]}>
      <Text style={styles.mesTitulo} accessibilityRole="header">
        {NOMBRE_MES(mes.getMonth())} {mes.getFullYear()}
      </Text>
      <View style={styles.controles}>
        <PressScale contentStyle={styles.ctrlBtn} onPress={() => mover(-1)} accessibilityLabel={vista === 'semana' ? 'Semana anterior' : 'Mes anterior'}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </PressScale>
        <PressScale contentStyle={styles.ctrlBtn} onPress={() => mover(1)} accessibilityLabel={vista === 'semana' ? 'Semana siguiente' : 'Mes siguiente'}>
          <Ionicons name="chevron-forward" size={24} color={colors.ink} />
        </PressScale>
        {/* "Hoy" se distingue de las flechas: contorno terracota. */}
        <PressScale contentStyle={styles.hoyBtn} onPress={irAHoy} accessibilityLabel="Ir a hoy">
          <Text style={styles.hoyBtnText}>Hoy</Text>
        </PressScale>
        <View style={styles.vistas} accessibilityRole="radiogroup" accessibilityLabel="Vista del calendario">
          {[['mes', 'Mes'], ['semana', 'Semana'], ['lista', 'Lista']].map(([v, l]) => (
            <PressScale
              key={v}
              contentStyle={[styles.vistaBtn, vista === v && styles.vistaBtnOn]}
              onPress={() => setVista(v)}
              accessibilityRole="radio"
              accessibilityState={{ checked: vista === v, selected: vista === v }}
              accessibilityLabel={`Vista ${l.toLowerCase()}`}
            >
              <Text style={[styles.vistaTexto, vista === v && styles.vistaTextoOn]}>{l}</Text>
            </PressScale>
          ))}
        </View>
        <PressScale contentStyle={styles.ctrlBtn} onPress={masAcciones} accessibilityLabel="Más acciones: exportar o imprimir">
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.ink} />
        </PressScale>
        <PrimaryButton title="+ Agregar" variant="accent" fullWidth={false} onPress={nuevo} style={styles.agregarBtn} />
      </View>
    </View>
  );

  const filtros = (
    <View style={styles.filtrosBloque}>
      <View style={styles.filtros} accessibilityRole="radiogroup">
        {FILTROS.map((f) => {
          const on = filtro === f.value;
          return (
            <PressScale
              key={f.value}
              contentStyle={[styles.pill, on && styles.pillOn]}
              onPress={() => {
                setFiltro(f.value);
                setMiembro(null);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, selected: on }}
              accessibilityLabel={f.label}
            >
              <Text style={[styles.pillText, on && styles.pillTextOn]}>{f.label}</Text>
            </PressScale>
          );
        })}
        <View style={styles.separador} />
        {[...integrantes.map((m) => ({ ...m, clase: 'integrante' })), ...mascotas.map((m) => ({ ...m, clase: 'mascota' }))].map((m) => {
          const on = miembro && miembro.clase === m.clase && miembro.id === m.id;
          return (
            <PressScale
              key={`${m.clase}-${m.id}`}
              contentStyle={[styles.avatarChip, on && styles.avatarChipOn]}
              onPress={() => setMiembro(on ? null : { clase: m.clase, id: m.id })}
              accessibilityRole="button"
              accessibilityState={{ selected: !!on }}
              accessibilityLabel={`Ver sólo los avisos de ${m.nombre}`}
            >
              <EntityAvatar avatarId={m.avatar_id} type={m.clase === 'mascota' ? 'pet' : 'person'} name={m.nombre} apellido={m.apellido} size={34} />
            </PressScale>
          );
        })}
      </View>
      <View style={styles.filtros}>
        {Object.entries(TIPO_AVISO).map(([k, t]) => {
          const on = tipoFiltro === k;
          return (
            <PressScale
              key={k}
              contentStyle={[styles.tipoChip, on && { backgroundColor: t.bg, borderColor: t.fg }]}
              onPress={() => setTipoFiltro(on ? null : k)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Mostrar sólo ${t.label.toLowerCase()}`}
            >
              <View style={[styles.swatch, { backgroundColor: t.fg }]} />
              <Text style={styles.tipoChipTexto}>{t.label}</Text>
            </PressScale>
          );
        })}
      </View>
    </View>
  );

  const leyenda = (
    <View style={styles.leyenda}>
      {Object.entries(TIPO_AVISO).map(([k, t]) => (
        <View key={k} style={styles.leyendaItem}>
          <View style={[styles.swatch, { backgroundColor: t.fg }]} />
          <Text style={styles.leyendaText}>{t.label}</Text>
        </View>
      ))}
      <View style={styles.leyendaItem}>
        <Ionicons name="checkmark-circle" size={14} color={colors.salvia} />
        <Text style={styles.leyendaText}>Dada / hecho</Text>
      </View>
      <View style={styles.leyendaItem}>
        <Ionicons name="remove-circle" size={14} color="#6B6357" />
        <Text style={styles.leyendaText}>No se dio</Text>
      </View>
      <View style={styles.leyendaItem}>
        <Ionicons name="close-circle" size={14} color="#B5391C" />
        <Text style={styles.leyendaText}>Sin marcar</Text>
      </View>
      <View style={styles.leyendaItem}>
        <Ionicons name="repeat" size={14} color={colors.textBody} />
        <Text style={styles.leyendaText}>Se repite</Text>
      </View>
    </View>
  );

  const grilla = (
    <PaperCard nivel={1} style={[styles.cartulina, !desktop && styles.cartulinaCompacta]}>
      {vista === 'mes' && (
        <MiniCalendar
          cabecera={false}
          compacta={!desktop}
          ancha={width >= 1280}
          mes={mes}
          onCambiarMes={setMes}
          marcados={marcados}
          seleccionado={diaElegido}
          onElegirDia={elegirDia}
          onAgregar={agregarEn}
        />
      )}
      {vista === 'semana' && (
        <VistaSemana base={fechaElegida} eventos={evs} seleccionado={diaElegido} onElegirDia={elegirDia} onAbrir={handleEditar} />
      )}
      {vista === 'lista' &&
        (loading ? (
          <View style={styles.lista}>
            <SkeletonReminderRow />
            <SkeletonReminderRow />
          </View>
        ) : (
          <VistaLista eventos={enLista} onAbrir={handleEditar} renderAcciones={acciones} />
        ))}
      {vista !== 'lista' && leyenda}
    </PaperCard>
  );

  const agenda = (
    <PaperCard nivel={1} style={styles.cartulina}>
      <Text style={styles.agendaEyebrow} accessibilityRole="header">Agenda del día</Text>
      <View style={styles.agendaTitulo}>
        <Text style={styles.agendaFecha}>{formatSectionTitle(fechaElegida)}</Text>
        {esHoyElegido && (
          <View style={styles.hoyTag}>
            <Text style={styles.hoyTagText}>Hoy</Text>
          </View>
        )}
      </View>
      {!esHoyElegido && (
        <PressScale contentStyle={styles.volverHoy} onPress={irAHoy} accessibilityLabel="Volver a hoy">
          <Ionicons name="return-up-back" size={18} color={colors.limeDeep} />
          <Text style={styles.volverHoyTexto}>Volver a hoy</Text>
        </PressScale>
      )}
      {!loading && !loadError && (
        <Text style={styles.agendaSub}>
          {delDia.length === 0 ? 'Nada programado' : plural(delDia.length, 'aviso')}
        </Text>
      )}

      {!!actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError('')} />}

      {loading ? (
        <View style={styles.lista}>
          <SkeletonReminderRow />
          <SkeletonReminderRow />
        </View>
      ) : loadError ? (
        <InlineError message="No pudimos cargar el calendario." onRetry={fetchRecordatorios} />
      ) : delDia.length === 0 ? (
        <View style={styles.diaLibre}>
          <PaperCutout icon="sun" tinte="ocre" size={96} rotate={-3} />
          <Text style={styles.diaLibreTitulo}>Nada programado este día</Text>
          <Text style={styles.diaLibreText}>
            {esPasado ? 'Ese día no hubo dosis ni turnos.' : 'Podés programar una dosis, un turno o una vacuna.'}
          </Text>
          {!esPasado && (
            <PrimaryButton title={esHoyElegido ? 'Agregar para hoy' : `Agregar el ${fechaCorta(fechaElegida)}`} variant="accent" onPress={() => agregarEn(diaElegido)} />
          )}
        </View>
      ) : (
        <View style={styles.lista}>{delDia.map((e, i) => fila(e, i, false))}</View>
      )}
    </PaperCard>
  );

  const pendientes = (
    <PaperCard nivel={1} hoja={sinMarcar.length ? 'terracota' : undefined} style={styles.cartulina} wrapperStyle={sinMarcar.length ? styles.hojaMargen : undefined}>
      <Text style={styles.agendaEyebrow} accessibilityRole="header">Quedó sin marcar</Text>
      {loading ? (
        <SkeletonReminderRow />
      ) : sinMarcar.length === 0 ? (
        <Text style={styles.proximoVacio}>Todo marcado. No quedó nada sin marcar.</Text>
      ) : (
        <View style={styles.lista}>
          <Text style={styles.agendaSub}>
            {sinMarcar.length === 1 ? '1 aviso ya pasó y nadie lo marcó.' : `${sinMarcar.length} avisos ya pasaron y nadie los marcó.`}
          </Text>
          {sinMarcar.slice(0, 4).map((e, i) => fila(e, i, true))}
          {sinMarcar.length > 4 && <Text style={styles.proximoVacio}>y {sinMarcar.length - 4} más…</Text>}
        </View>
      )}
    </PaperCard>
  );

  const resumen = (
    <PaperCard nivel={1} style={styles.cartulina}>
      <Text style={styles.agendaEyebrow} accessibilityRole="header">Resumen de {NOMBRE_MES(mes.getMonth()).toLowerCase()}</Text>
      <View style={styles.resumenGrilla}>
        <View style={styles.resumenDato}>
          <Text style={styles.resumenNum}>{resumenMes.pasadas === 0 ? '—' : `${resumenMes.dadas} de ${resumenMes.pasadas}`}</Text>
          <Text style={styles.resumenEtiqueta}>Dosis dadas</Text>
        </View>
        <View style={styles.resumenDato}>
          <Text style={styles.resumenNum}>{resumenMes.turnos}</Text>
          <Text style={styles.resumenEtiqueta}>{resumenMes.turnos === 1 ? 'Turno' : 'Turnos'}</Text>
        </View>
        <View style={styles.resumenDato}>
          <Text style={styles.resumenNum}>{resumenMes.vacunas}</Text>
          <Text style={styles.resumenEtiqueta}>{resumenMes.vacunas === 1 ? 'Vacuna' : 'Vacunas'}</Text>
        </View>
      </View>
      <Text style={styles.proximoVacio}>
        {resumenMes.total === 0
          ? 'Nada programado este mes.'
          : `Dosis dadas: de las que ya pasaron este mes, cuántas se marcaron como dadas (${plural(resumenMes.total, 'aviso')} en el mes).`}
      </Text>
    </PaperCard>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          desktop ? styles.scrollDesktop : styles.scrollMobile,
          { paddingTop: (desktop ? 32 : 12) + insets.top },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />}
      >
        <View style={[styles.container, desktop && styles.containerIzq]}>
          {header}
          {filtros}
          {desktop ? (
            <View style={styles.columns}>
              <View style={styles.colGrilla}>{grilla}</View>
              <View style={styles.colAgenda}>
                {agenda}
                {pendientes}
                {resumen}
              </View>
            </View>
          ) : (
            <View style={styles.stack}>
              {grilla}
              {agenda}
              {pendientes}
              {resumen}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 112 },
  scrollDesktop: { paddingHorizontal: 48 },
  scrollMobile: { paddingHorizontal: 20 },
  container: { width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center', gap: 16 },
  // Escritorio: alineado a la izquierda, pegado a la barra lateral (sin pasillo vacío).
  containerIzq: { alignSelf: 'flex-start' },

  // ---- encabezado
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  headerMobile: { flexDirection: 'column', alignItems: 'flex-start' },
  mesTitulo: { fontSize: 36, lineHeight: 44, fontFamily: SERIF_BOLD, color: colors.ink },
  controles: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  ctrlBtn: {
    minWidth: 48,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoyBtn: { minHeight: 48, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1.5, borderColor: colors.accentStrong, alignItems: 'center', justifyContent: 'center' },
  hoyBtnText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.limeDeep },
  vistas: { flexDirection: 'row', borderRadius: 24, backgroundColor: colors.arena, padding: 3 },
  vistaBtn: { minHeight: 42, paddingHorizontal: 16, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  vistaBtnOn: { backgroundColor: '#FFFFFF' },
  vistaTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.textBody },
  vistaTextoOn: { color: colors.ink },
  filtrosBloque: { gap: 8 },
  separador: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(42, 36, 33, 0.15)', marginHorizontal: 4 },
  avatarChip: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  avatarChipOn: { borderColor: colors.ink, backgroundColor: '#FFFFFF' },
  tipoChip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(42, 36, 33, 0.18)' },
  tipoChipTexto: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.ink },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  hojaMargen: { marginRight: 7, marginBottom: 8 },
  hechoTag: { fontSize: 14, fontFamily: poppinsWeight('600'), color: '#3B5A4C', paddingVertical: 8 },
  omitidoTag: { color: '#6B6357' },
  marcaFila: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  btnTexto: { minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  btnTextoTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: '#AA451D', textDecorationLine: 'underline' },
  btnHecho: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.salvia },
  btnHechoTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: '#FFFFFF' },
  btnSec: { minHeight: 48, paddingHorizontal: 16, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(42, 36, 33, 0.22)' },
  btnSecTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.ink },
  volverHoy: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 48 },
  volverHoyTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.limeDeep },
  resumenGrilla: { flexDirection: 'row', gap: 12 },
  resumenDato: { flex: 1, alignItems: 'flex-start', gap: 2 },
  resumenNum: { fontSize: 28, lineHeight: 34, fontFamily: SERIF_BOLD, color: colors.ink },
  resumenEtiqueta: { fontSize: 14, lineHeight: 20, color: colors.textBody },
  agregarBtn: { marginLeft: 8 },

  // ---- filtros (píldoras)
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.textBody },
  pillTextOn: { color: colors.onAccent },

  // ---- layout
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  // grid-template-columns: minmax(0, 1.75fr) minmax(340px, 1fr), gap 24
  colGrilla: { flex: 1.75, minWidth: 0 },
  colAgenda: { flex: 1, minWidth: 340, gap: 24 },
  stack: { gap: 16 },

  // Cartulina: fondo blanco, borde cálido de 1 px y sombra corta (en web, de dos capas vía theme/paper.js).
  cartulina: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 0,
    elevation: 2,
  },
  // Móvil: menos relleno para que las 7 columnas de la grilla queden lo más anchas posible.
  cartulinaCompacta: { padding: 8 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EFE8DF' },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leyendaText: { fontSize: 14, lineHeight: 20, color: colors.textBody },

  // ---- agenda del día
  agendaEyebrow: { fontSize: 14, fontFamily: poppinsWeight('700'), color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  agendaTitulo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  agendaFecha: { fontSize: 24, lineHeight: 32, fontFamily: SERIF_BOLD, color: colors.ink },
  hoyTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.accentStrong },
  hoyTagText: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.onAccent },
  agendaSub: { fontSize: 15, lineHeight: 22, color: colors.textBody, marginTop: 4, marginBottom: 12 },
  lista: { gap: 12, marginTop: 8 },


  proximoVacio: { fontSize: 16, lineHeight: 24, color: colors.textBody, marginTop: 8 },

  // ---- día libre
  diaLibre: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  diaLibreTitulo: { fontSize: 24, lineHeight: 32, fontFamily: SERIF_BOLD, color: colors.ink, marginTop: 8 },
  diaLibreText: { fontSize: 16, lineHeight: 24, color: colors.textBody, textAlign: 'center', marginBottom: 8 },

  card: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
    padding: 16,
  },
});
