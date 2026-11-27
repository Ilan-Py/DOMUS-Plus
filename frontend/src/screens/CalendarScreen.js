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
import { colors, reminderBadge } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import api, { getList } from '../api/client';
import { useFamily } from '../context/FamilyContext';
import ErrorBanner from '../components/ErrorBanner';
import InlineError from '../components/InlineError';
import PrimaryButton from '../components/PrimaryButton';
import PressScale from '../components/PressScale';
import Skeleton from '../components/Skeleton';
import MiniCalendar, { dayKey } from '../components/MiniCalendar';
import { EmptyDoodle } from '../components/FamilyDoodles';
import { cancelarNotificacion, sincronizarNotificaciones } from '../utils/notifications';
import { parseFechaHora } from '../utils/displayFormat';
import { confirmarDestructivo } from '../utils/confirm';
import FadeSlideIn from '../components/FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from '../components/FadeOutRow';

// Layout (ver DESIGN.md): desde 1024px, columna izquierda de 320px (mini
// calendario + filtros) y agenda a la derecha, en un contenedor de hasta
// 1120px. Debajo, una sola columna.
const DESKTOP_BREAKPOINT = 1024;
const MINI_CAL_BREAKPOINT = 768;
const CONTAINER_MAX_WIDTH = 1120;
const LEFT_COLUMN_WIDTH = 348;

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const TIPO_LABELS = { vacuna: 'Vacuna', control: 'Control', medicacion: 'Medicación' };

const FILTROS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Vacuna', value: 'vacuna' },
  { label: 'Control', value: 'control' },
  { label: 'Medicación', value: 'medicacion' },
];

function formatSectionTitle(fecha) {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

// Etiqueta corta de un día elegido en el mini calendario, ej. "1 de diciembre".
function etiquetaDia(key) {
  const [, m, d] = key.split('-').map(Number);
  return `${d} de ${MESES[m]}`;
}

function formatHora(fecha) {
  const h = String(fecha.getHours()).padStart(2, '0');
  const m = String(fecha.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// El backend ya devuelve ORDER BY fecha_hora ASC — sólo se agrupa por día.
function groupByDate(recordatorios) {
  const map = new Map();
  recordatorios.forEach((item) => {
    const fecha = parseFechaHora(item.fecha_hora);
    const key = dayKey(fecha);
    if (!map.has(key)) map.set(key, { key, title: formatSectionTitle(fecha), data: [] });
    map.get(key).data.push(item);
  });
  return Array.from(map.values());
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
  const mostrarMiniCal = width >= MINI_CAL_BREAKPOINT;
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
  const [diaElegido, setDiaElegido] = useState(null);
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  // De quién es cada recordatorio: se deduce de la vacuna/tratamiento al que
  // está vinculado (la API no guarda el dueño en el recordatorio en sí).
  const [duenos, setDuenos] = useState({});

  const hasLoadedOnceRef = useRef(false);
  const mesInicialRef = useRef(false);

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
      // La primera vez, el mini calendario abre en el mes del próximo
      // recordatorio pendiente (si no hay, en el mes actual).
      if (!mesInicialRef.current) {
        mesInicialRef.current = true;
        const ahora = new Date();
        const proximo = datos
          .filter((r) => r.activo)
          .map((r) => parseFechaHora(r.fecha_hora))
          .filter((f) => f >= ahora)
          .sort((x, y) => x - y)[0];
        if (proximo) setMes(new Date(proximo.getFullYear(), proximo.getMonth(), 1));
      }
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

  async function handleDesactivar(id) {
    setActionError('');
    setDismissingId(id);
    try {
      await api.patch(`/api/recordatorios/${id}/desactivar`);
      mostrarToast('Marcado como hecho');
      await cancelarNotificacion(id);
      setExitingId(id);
      await new Promise((resolve) => setTimeout(resolve, EXIT_DURATION));
      await fetchRecordatorios();
    } catch (err) {
      setActionError(err.mensaje);
    } finally {
      setDismissingId(null);
      setExitingId(null);
    }
  }

  function handleEditar(item) {
    navigation.navigate('AddReminder', { editando: item });
  }

  async function handleEliminar(id) {
    setActionError('');
    setDismissingId(id);
    try {
      await api.delete(`/api/recordatorios/${id}`);
      await cancelarNotificacion(id);
      setExitingId(id);
      await new Promise((resolve) => setTimeout(resolve, EXIT_DURATION));
      await fetchRecordatorios();
    } catch (err) {
      setActionError(err.mensaje);
    } finally {
      setDismissingId(null);
      setExitingId(null);
    }
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

  // Filtro por tipo -> base para el calendario y la agenda.
  const porTipo = useMemo(
    () => (filtro === 'todos' ? recordatorios : recordatorios.filter((r) => r.tipo === filtro)),
    [recordatorios, filtro]
  );
  // día -> tipos de recordatorio de ese día (para los puntos de colores del calendario)
  const marcados = useMemo(() => {
    const mapa = new Map();
    porTipo.forEach((r) => {
      const k = dayKey(parseFechaHora(r.fecha_hora));
      const tipos = mapa.get(k) || [];
      if (!tipos.includes(r.tipo)) tipos.push(r.tipo);
      mapa.set(k, tipos);
    });
    return mapa;
  }, [porTipo]);
  const visibles = useMemo(
    () => (diaElegido ? porTipo.filter((r) => dayKey(parseFechaHora(r.fecha_hora)) === diaElegido) : porTipo),
    [porTipo, diaElegido]
  );
  const sections = useMemo(() => groupByDate(visibles), [visibles]);

  const subtitulo = `${recordatorios.length} recordatorio${recordatorios.length === 1 ? '' : 's'}`;
  const hayFiltros = filtro !== 'todos' || !!diaElegido;

  // ---------------- bloques ----------------
  const nuevoBtn = (
    <PrimaryButton
      title="+ Nuevo recordatorio"
      variant="accent"
      fullWidth={!desktop}
      onPress={nuevo}
    />
  );

  const header = (
    <View style={[styles.header, !desktop && styles.headerMobile]}>
      <View style={styles.headerText}>
        <Text style={styles.title} accessibilityRole="header">
          Calendario
        </Text>
        <Text style={styles.subtitle}>{subtitulo}</Text>
      </View>
      {nuevoBtn}
    </View>
  );

  const filtros = (
    <View>
      <Text style={styles.sideLabel}>Mostrar</Text>
      <View style={styles.filterGrid}>
        {FILTROS.map((f) => {
          const on = filtro === f.value;
          return (
            <PressScale
              key={f.value}
              style={styles.filterCell}
              contentStyle={[styles.chip, on && styles.chipOn]}
              onPress={() => setFiltro(f.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, selected: on }}
              accessibilityLabel={f.label}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
            </PressScale>
          );
        })}
      </View>
    </View>
  );

  const miniCal = mostrarMiniCal ? (
    <View style={styles.sideCard}>
      <MiniCalendar
        mes={mes}
        onCambiarMes={setMes}
        marcados={marcados}
        seleccionado={diaElegido}
        onElegirDia={setDiaElegido}
      />
    </View>
  ) : null;

  const filtrosCard = <View style={styles.sideCard}>{filtros}</View>;

  const agenda = (
    <View style={styles.agenda}>
      {!!actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError('')} />}

      {hayFiltros && (
        <View style={styles.activeFilters}>
          {!!diaElegido && (
            <PressScale
              contentStyle={[styles.filterTag, styles.filterTagDay]}
              onPress={() => setDiaElegido(null)}
              accessibilityLabel={`Quitar el filtro del día ${etiquetaDia(diaElegido)}`}
            >
              <Text style={[styles.filterTagText, styles.filterTagDayText]}>{etiquetaDia(diaElegido)}</Text>
              <Ionicons name="close" size={18} color={colors.limeDeep} />
            </PressScale>
          )}
          {filtro !== 'todos' && (
            <PressScale
              contentStyle={styles.filterTag}
              onPress={() => setFiltro('todos')}
              accessibilityLabel={`Quitar el filtro ${TIPO_LABELS[filtro]}`}
            >
              <Text style={styles.filterTagText}>{TIPO_LABELS[filtro]}</Text>
              <Ionicons name="close" size={18} color={colors.ink} />
            </PressScale>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.list}>
          <SkeletonReminderRow />
          <SkeletonReminderRow />
          <SkeletonReminderRow />
        </View>
      ) : loadError ? (
        <InlineError message="No pudimos cargar los recordatorios." onRetry={fetchRecordatorios} />
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <EmptyDoodle variant="calendario" size={64} />
          <Text style={styles.emptyText}>
            {hayFiltros ? 'No hay recordatorios con este filtro.' : 'No tenés recordatorios.'}
          </Text>
          {!hayFiltros && (
            <View style={styles.emptyAction}>
              <PrimaryButton title="+ Nuevo recordatorio" variant="accent" fullWidth={false} onPress={nuevo} />
            </View>
          )}
        </View>
      ) : (
        sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={[styles.sectionLabel, !!diaElegido && styles.sectionLabelFocus]} accessibilityRole="header">
              {section.title}
            </Text>
            <View style={styles.list}>
              {section.data.map((item, i) => {
                const fecha = parseFechaHora(item.fecha_hora);
                const hecho = !item.activo;
                const vencido = !hecho && fecha < new Date();
                const dueno = duenoDe(item);
                const ocupado = dismissingId === item.id;
                return (
                  <FadeSlideIn key={item.id} index={i}>
                    <FadeOutRow exiting={exitingId === item.id}>
                      <PressScale
                        contentStyle={[styles.card, !!diaElegido && styles.cardFocus, hecho && styles.cardDone]}
                        onPress={() => handleEditar(item)}
                        disabled={ocupado}
                        accessibilityLabel={`Editar recordatorio: ${item.descripcion || TIPO_LABELS[item.tipo] || ''}`}
                      >
                        <PressScale
                          contentStyle={styles.checkHit}
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
                          <View style={[styles.check, hecho && styles.checkOn]}>
                            {ocupado ? (
                              <ActivityIndicator size="small" color={colors.iconWarm} />
                            ) : hecho ? (
                              <Ionicons name="checkmark" size={18} color={colors.onAccent} />
                            ) : null}
                          </View>
                        </PressScale>

                        <View style={styles.cardMain}>
                          {/* Hora primero; la categoría como texto con un punto de color. */}
                          <View style={styles.cardTop}>
                            <Text style={styles.cardHora}>{formatHora(fecha)}</Text>
                            <Text style={styles.cardSep}>·</Text>
                            <View style={[styles.dot, { backgroundColor: (reminderBadge[item.tipo] ?? reminderBadge.control).text }]} />
                            <Text style={styles.cardTipo}>{TIPO_LABELS[item.tipo] ?? item.tipo}</Text>
                            {vencido && <Text style={styles.cardVencido}>· Vencido</Text>}
                            {!!dueno && <Text style={styles.cardTipo}>· {dueno}</Text>}
                          </View>
                          {!!item.descripcion && (
                            <Text style={[styles.cardDesc, hecho && styles.cardDescDone]}>{item.descripcion}</Text>
                          )}
                        </View>

                        <Ionicons name="chevron-forward" size={20} color={colors.iconWarm} style={styles.cardChevron} />
                      </PressScale>
                    </FadeOutRow>
                  </FadeSlideIn>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          desktop ? styles.scrollDesktop : styles.scrollMobile,
          { paddingTop: (desktop ? 24 : 12) + insets.top },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />}
      >
        <View style={styles.container}>
          {header}
          {desktop ? (
            <View style={styles.columns}>
              <View style={styles.colLeft}>
                {miniCal}
                {filtrosCard}
              </View>
              <View style={styles.colRight}>{agenda}</View>
            </View>
          ) : (
            <View style={styles.stack}>
              {miniCal}
              {filtrosCard}
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
  scroll: { paddingBottom: 110 },
  scrollDesktop: { paddingHorizontal: 32 },
  scrollMobile: { paddingHorizontal: 18 },
  container: { width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  headerMobile: { flexDirection: 'column', alignItems: 'stretch' },
  headerText: { flexShrink: 1 },
  title: { fontSize: 26, lineHeight: 34, fontFamily: poppinsWeight('600'), color: colors.ink },
  subtitle: { fontSize: 16, lineHeight: 22, color: colors.textBody, marginTop: 2 },

  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  colLeft: { width: LEFT_COLUMN_WIDTH, gap: 16 },
  colRight: { flex: 1 },
  stack: { gap: 16 },

  sideCard: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
    padding: 16,
  },
  sideLabel: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.textBody, marginBottom: 8 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterCell: { width: '48%', flexGrow: 1 },
  chip: {
    minHeight: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    backgroundColor: colors.glassFillStrong,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.textBody },
  chipTextOn: { color: colors.onAccent },

  agenda: { gap: 4 },
  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.badgeSand,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  filterTagDay: { backgroundColor: colors.accentTint, borderColor: colors.accentStrong },
  filterTagDayText: { color: colors.limeDeep },
  filterTagText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },

  section: { marginBottom: 12 },
  // Encabezado de fecha: gris cálido suave, peso 600 y un poco de espaciado.
  sectionLabel: {
    fontSize: 14,
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionLabelFocus: { color: colors.limeDeep },
  list: { gap: 12 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 4,
    minHeight: 72,
  },
  // Completado: la tarjeta baja de opacidad (el tilde verde ya lo indica).
  // Cuando se elige un día en el calendario, las tarjetas de ese día se destacan.
  cardFocus: { backgroundColor: colors.accentTint, borderColor: colors.accentStrong, borderLeftWidth: 5 },
  cardDone: { opacity: 0.6 },
  checkHit: { width: 48, height: 56, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.iconWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  cardMain: { flex: 1, paddingVertical: 4, paddingHorizontal: 8 },
  cardTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  cardSep: { fontSize: 16, color: colors.textMuted },
  dot: { width: 6, height: 6, borderRadius: 3 },
  cardTipo: { fontSize: 15, color: colors.textBody },
  cardVencido: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.limeDeep },
  cardChevron: { marginRight: 12 },
  cardHora: { fontVariant: ['tabular-nums'], fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  cardDesc: { fontSize: 16, lineHeight: 22, color: colors.textBody, marginTop: 6 },
  cardDescDone: { textDecorationLine: 'line-through' },


  empty: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.badgeSand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 17, lineHeight: 24, color: colors.textBody, textAlign: 'center' },
  emptyAction: { marginTop: 4 },
});
