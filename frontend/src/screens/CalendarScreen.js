import React, { useCallback, useMemo, useRef, useState } from 'react';
import { mostrarToast } from '../components/ToastHost';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
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
import PaperCutout from '../components/PaperCutout';
import Pulse from '../components/Pulse';
import { cancelarNotificacion, sincronizarNotificaciones } from '../utils/notifications';
import { parseFechaHora } from '../utils/displayFormat';
import { confirmarDestructivo } from '../utils/confirm';
import FadeSlideIn from '../components/FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from '../components/FadeOutRow';

// Layout: desde 1024 px, grilla mensual a la izquierda (~65 %) y "Agenda del día" a la derecha
// (~35 %), en un contenedor de hasta 1180 px alineado a la izquierda. Debajo, apilados.
const DESKTOP_BREAKPOINT = 1024;
const CONTAINER_MAX_WIDTH = 1180;

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const TIPO_LABELS = { vacuna: 'Vacuna', control: 'Control', medicacion: 'Medicación' };

const FILTROS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Personas', value: 'personas' },
  { label: 'Mascotas', value: 'mascotas' },
];

// Código de color: medicación/dosis en terracota, mascotas/veterinario en salvia y turnos o controles
// médicos en ocre. `texto` es una variante más oscura para que las etiquetas se lean bien.
const CATEGORIAS = {
  medicacion: { label: 'Medicación', fg: colors.accentStrong, bg: colors.terracotaSoft, texto: '#9A3416' },
  mascota: { label: 'Mascota', fg: colors.salvia, bg: colors.salviaSoft, texto: '#3B5A4C' },
  turno: { label: 'Turno o control', fg: colors.ocre, bg: colors.ocreSoft, texto: '#7A5112' },
};

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

export default function CalendarScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= DESKTOP_BREAKPOINT;
  const { integrantes, mascotas } = useFamily();

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
  // Siempre hay un día elegido (por defecto, hoy): la agenda de la derecha muestra ese día.
  const [diaElegido, setDiaElegido] = useState(() => dayKey(new Date()));
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
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

  async function handleDesactivar(id) {
    const ok = await salirOptimista(id, () => api.patch(`/api/recordatorios/${id}/desactivar`));
    if (ok) mostrarToast('Marcado como hecho');
  }

  function handleEditar(item) {
    navigation.navigate('AddReminder', { editando: item });
  }

  async function handleEliminar(id) {
    await salirOptimista(id, () => api.delete(`/api/recordatorios/${id}`));
  }

  function confirmEliminar(item) {
    confirmarDestructivo(
      'Eliminar recordatorio',
      `¿Seguro que querés eliminar este recordatorio${item.descripcion ? ` ("${item.descripcion}")` : ''}?`,
      () => handleEliminar(item.id)
    );
  }

  // Marcar como hecho = desactivar (deja de figurar como pendiente; la API no
  // permite volver a activarlo).
  function confirmHecho(item) {
    confirmarDestructivo(
      'Marcar como hecho',
      'Va a dejar de figurar como pendiente. Esto no se puede deshacer desde la app.',
      () => handleDesactivar(item.id),
      'marcar como hecho'
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
  // Categoría para el color: medicación primero; si no, mascota; si no, turno o control.
  function categoriaDe(item) {
    if (item.tipo === 'medicacion') return 'medicacion';
    return esDeMascota(item) ? 'mascota' : 'turno';
  }

  // Filtro por quién (Todos / Personas / Mascotas) -> base para la grilla y la agenda.
  const porQuien = useMemo(
    () =>
      filtro === 'todos'
        ? recordatorios
        : recordatorios.filter((r) => (filtro === 'mascotas' ? esDeMascota(r) : !esDeMascota(r))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recordatorios, filtro, integrantes, mascotas, duenos]
  );
  // día -> categorías de ese día (para los puntos de color de la grilla)
  const marcados = useMemo(() => {
    const mapa = new Map();
    porQuien.forEach((r) => {
      const k = dayKey(parseFechaHora(r.fecha_hora));
      const cats = mapa.get(k) || [];
      const c = categoriaDe(r);
      if (!cats.includes(c)) cats.push(c);
      mapa.set(k, cats);
    });
    return mapa;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porQuien, integrantes, mascotas, duenos]);
  const delDia = useMemo(
    () =>
      porQuien
        .filter((r) => dayKey(parseFechaHora(r.fecha_hora)) === diaElegido)
        .sort((x, y) => parseFechaHora(x.fecha_hora) - parseFechaHora(y.fecha_hora)),
    [porQuien, diaElegido]
  );

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
  const moverMes = (delta) => setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));

  // ---------------- bloques ----------------
  const header = (
    <View style={[styles.header, !desktop && styles.headerMobile]}>
      <Text style={styles.mesTitulo} accessibilityRole="header">
        {NOMBRE_MES(mes.getMonth())} {mes.getFullYear()}
      </Text>
      <View style={styles.controles}>
        <PressScale contentStyle={styles.ctrlBtn} onPress={() => moverMes(-1)} accessibilityLabel="Mes anterior">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </PressScale>
        <PressScale contentStyle={[styles.ctrlBtn, styles.hoyBtn]} onPress={irAHoy} accessibilityLabel="Ir a hoy">
          <Text style={styles.hoyBtnText}>Hoy</Text>
        </PressScale>
        <PressScale contentStyle={styles.ctrlBtn} onPress={() => moverMes(1)} accessibilityLabel="Mes siguiente">
          <Ionicons name="chevron-forward" size={24} color={colors.ink} />
        </PressScale>
        <PrimaryButton title="+ Agregar" variant="accent" fullWidth={false} onPress={nuevo} style={styles.agregarBtn} />
      </View>
    </View>
  );

  const filtros = (
    <View style={styles.filtros} accessibilityRole="radiogroup">
      {FILTROS.map((f) => {
        const on = filtro === f.value;
        return (
          <PressScale
            key={f.value}
            contentStyle={[styles.pill, on && styles.pillOn]}
            onPress={() => setFiltro(f.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, selected: on }}
            accessibilityLabel={f.label}
          >
            <Text style={[styles.pillText, on && styles.pillTextOn]}>{f.label}</Text>
          </PressScale>
        );
      })}
    </View>
  );

  const grilla = (
    <View {...paper('cartulina')} style={styles.cartulina}>
      <MiniCalendar
        cabecera={false}
        mes={mes}
        onCambiarMes={setMes}
        marcados={marcados}
        seleccionado={diaElegido}
        onElegirDia={setDiaElegido}
      />
      <View style={styles.leyenda}>
        {Object.entries(CATEGORIAS).map(([k, c]) => (
          <View key={k} style={styles.leyendaItem}>
            <View style={[styles.leyendaPunto, { backgroundColor: c.fg }]} />
            <Text style={styles.leyendaText}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const agenda = (
    <View {...paper('cartulina')} style={styles.cartulina}>
      <Text style={styles.agendaEyebrow} accessibilityRole="header">Agenda del día</Text>
      <View style={styles.agendaTitulo}>
        <Text style={styles.agendaFecha}>{formatSectionTitle(fechaElegida)}</Text>
        {esHoyElegido && (
          <View style={styles.hoyTag}>
            <Text style={styles.hoyTagText}>Hoy</Text>
          </View>
        )}
      </View>
      {!loading && !loadError && (
        <Text style={styles.agendaSub}>
          {delDia.length === 0 ? 'Sin pendientes' : `${delDia.length} recordatorio${delDia.length === 1 ? '' : 's'}`}
        </Text>
      )}

      {!!actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError('')} />}

      {loading ? (
        <View style={styles.lista}>
          <SkeletonReminderRow />
          <SkeletonReminderRow />
        </View>
      ) : loadError ? (
        <InlineError message="No pudimos cargar los recordatorios." onRetry={fetchRecordatorios} />
      ) : delDia.length === 0 ? (
        <View style={styles.diaLibre}>
          <PaperCutout icon="sun" tinte="ocre" size={96} rotate={-3} />
          <Text style={styles.diaLibreTitulo}>Día libre</Text>
          <Text style={styles.diaLibreText}>
            {esPasado ? 'No hubo recordatorios este día.' : 'No tenés nada pendiente para este día.'}
          </Text>
          {!esPasado && (
            <PrimaryButton
              title="+ Agregar para este día"
              variant="accent"
              onPress={() => navigation.navigate('AddReminder', { fechaInicial: diaElegido })}
            />
          )}
        </View>
      ) : (
        <View style={styles.lista}>
          {delDia.map((item, i) => {
            const fecha = parseFechaHora(item.fecha_hora);
            const hecho = !item.activo;
            const vencido = !hecho && fecha < new Date();
            const dueno = duenoDe(item);
            const ocupado = dismissingId === item.id;
            const cat = CATEGORIAS[categoriaDe(item)];
            return (
              <FadeSlideIn key={item.id} index={i}>
                <FadeOutRow exiting={exitingId === item.id}>
                  <PressScale
                    contentStyle={[styles.item, hecho && styles.itemDone]}
                    onPress={() => handleEditar(item)}
                    disabled={ocupado}
                    accessibilityLabel={`Editar recordatorio: ${item.descripcion || TIPO_LABELS[item.tipo] || ''}`}
                  >
                    {/* Barra lateral de 4 px del color de su categoría */}
                    <View pointerEvents="none" style={[styles.itemBarra, { backgroundColor: cat.fg }]} />
                    <View style={styles.itemMain}>
                      <View style={styles.itemTop}>
                        <Text style={styles.itemHora}>{formatHora(fecha)}</Text>
                        <View style={[styles.catPill, { backgroundColor: cat.bg }]}>
                          <Text style={[styles.catPillText, { color: cat.texto }]}>{TIPO_LABELS[item.tipo] ?? item.tipo}</Text>
                        </View>
                        {vencido && <Text style={styles.itemVencido}>Vencido</Text>}
                      </View>
                      {!!item.descripcion && (
                        <Text style={[styles.itemDesc, hecho && styles.itemDescDone]}>{item.descripcion}</Text>
                      )}
                      {!!dueno && <Text style={styles.itemDueno}>{dueno}</Text>}
                    </View>

                    <Pulse trigger={ocupado} radio={12}>
                      <PressScale
                        contentStyle={[styles.hechoBtn, { borderColor: cat.fg }, hecho && { backgroundColor: cat.fg }]}
                        onPress={() => (hecho ? null : confirmHecho(item))}
                        disabled={hecho || ocupado}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: hecho }}
                        accessibilityLabel={
                          hecho
                            ? `Hecho: ${item.descripcion || 'recordatorio'}`
                            : `Marcar como hecho: ${item.descripcion || 'recordatorio'}`
                        }
                      >
                        {ocupado ? (
                          <ActivityIndicator size="small" color={cat.fg} />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={22} color={hecho ? colors.onAccent : cat.fg} />
                            <Text style={[styles.hechoText, { color: hecho ? colors.onAccent : cat.texto }]}>Hecho</Text>
                          </>
                        )}
                      </PressScale>
                    </Pulse>
                  </PressScale>
                </FadeOutRow>
              </FadeSlideIn>
            );
          })}
        </View>
      )}
    </View>
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
              <View style={styles.colAgenda}>{agenda}</View>
            </View>
          ) : (
            <View style={styles.stack}>
              {grilla}
              {agenda}
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
  hoyBtn: { paddingHorizontal: 20 },
  hoyBtnText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
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
  colGrilla: { flex: 65 },
  colAgenda: { flex: 35 },
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
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EFE8DF' },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leyendaPunto: { width: 10, height: 10, borderRadius: 5 },
  leyendaText: { fontSize: 14, lineHeight: 20, color: colors.textBody },

  // ---- agenda del día
  agendaEyebrow: { fontSize: 14, fontFamily: poppinsWeight('700'), color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  agendaTitulo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  agendaFecha: { fontSize: 24, lineHeight: 32, fontFamily: SERIF_BOLD, color: colors.ink },
  hoyTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.accentStrong },
  hoyTagText: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.onAccent },
  agendaSub: { fontSize: 15, lineHeight: 22, color: colors.textBody, marginTop: 4, marginBottom: 12 },
  lista: { gap: 12, marginTop: 8 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 80,
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 12,
    overflow: 'hidden',
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
  },
  itemDone: { opacity: 0.6 },
  itemBarra: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 4 },
  itemMain: { flex: 1, gap: 4, minWidth: 0 },
  itemTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  itemHora: { fontVariant: ['tabular-nums'], fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink },
  catPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  catPillText: { fontSize: 14, lineHeight: 20, fontFamily: poppinsWeight('600') },
  itemVencido: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.limeDeep },
  itemDesc: { fontSize: 16, lineHeight: 22, color: colors.ink },
  itemDescDone: { textDecorationLine: 'line-through' },
  itemDueno: { fontSize: 15, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.iconWarm },
  hechoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 48,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  hechoText: { fontSize: 15, fontFamily: poppinsWeight('600') },

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
