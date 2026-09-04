import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow, cardBase, reminderBadge } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import api, { getList } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import PressScale from '../components/PressScale';
import Skeleton from '../components/Skeleton';
import { cancelarNotificacion } from '../utils/notifications';
import { parseFechaHora } from '../utils/displayFormat';
import { confirmarDestructivo } from '../utils/confirm';
import Blob from '../components/Blob';
import FadeSlideIn from '../components/FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from '../components/FadeOutRow';

// Silueta de una fila de recordatorio — badge + hora + una línea de
// descripción — mismo layout de `row`, armado con el Skeleton compartido.
function SkeletonReminderRow() {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <Skeleton width={70} height={20} borderRadius={999} />
          <Skeleton width={40} height={13} />
        </View>
        <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const TIPO_LABELS = { vacuna: 'Vacuna', control: 'Control', medicacion: 'Medicación' };
// Un ícono Ionicons-outline por tipo — mismo lenguaje visual que el resto de
// la app (pencil-outline/trash-outline/calendar-outline en ScreenHeader/tabs),
// antes el badge era sólo color+texto, sin apoyo visual para escanear la
// lista rápido o para quien no distingue bien el color. 'vencido' no está acá
// — usa su propio ícono fijo (alert-circle-outline) porque pisa el tipo, no
// es uno de los 3 valores del enum.
const TIPO_ICONS = { vacuna: 'medical-outline', control: 'clipboard-outline', medicacion: 'medkit-outline' };

// Sin librería de Intl (riesgo de soporte parcial en Hermes) — formateo manual.
function formatSectionTitle(fecha) {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

function formatHora(fecha) {
  const h = String(fecha.getHours()).padStart(2, '0');
  const m = String(fecha.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// parseFechaHora vive en utils/displayFormat.js (compartida con
// utils/notifications.js y, ahora, el prefill de edición en
// AddReminderScreen.js) — ver el comentario ahí para el bug de 3 horas que
// tenía la versión anterior de esta función, que vivía sólo acá.

// El backend ya devuelve ORDER BY fecha_hora ASC — solo se agrupa por día,
// sin volver a ordenar (Map preserva el orden de inserción).
function groupByDate(recordatorios) {
  const map = new Map();
  recordatorios.forEach((item) => {
    const fecha = parseFechaHora(item.fecha_hora);
    const key = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
    if (!map.has(key)) {
      map.set(key, { title: formatSectionTitle(fecha), data: [] });
    }
    map.get(key).data.push(item);
  });
  return Array.from(map.values());
}

// vencido pisa el badge de tipo — un recordatorio activo cuya fecha_hora ya
// pasó se muestra como "Vencido" en vez de Vacuna/Control/Medicación. Es
// puramente visual: no hay cron ni job en esta app que desactive
// recordatorios vencidos solo, así que siguen en la lista (dismissible y
// editable como cualquier otro) hasta que alguien los desactive/elimine a mano.
function TipoBadge({ tipo, vencido }) {
  // Fallback a 'control' — de los 3 tipos válidos (vacuna/control/medicacion)
  // es el más neutro semánticamente (no implica una acción médica específica
  // como vacuna, ni un tratamiento en curso). Un `tipo` corrupto/inesperado
  // ahora degrada a ese badge en vez de crashear en badge.bg/badge.text.
  const badge = vencido ? reminderBadge.vencido : reminderBadge[tipo] ?? reminderBadge.control;
  const label = vencido ? 'Vencido' : (TIPO_LABELS[tipo] ?? tipo);
  const icon = vencido ? 'alert-circle-outline' : TIPO_ICONS[tipo] ?? TIPO_ICONS.control;
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Ionicons name={icon} size={12} color={badge.text} />
      <Text style={[styles.badgeText, { color: badge.text }]}>{label}</Text>
    </View>
  );
}

export default function CalendarScreen({ navigation }) {
  const [recordatorios, setRecordatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [dismissingId, setDismissingId] = useState(null);
  // Id de la fila que ya confirmó desactivar/eliminar en el backend y está
  // en su animación de salida (FadeOutRow) — distinto de dismissingId
  // (activo desde que se confirma hasta que la llamada resuelve, muestra el
  // spinner inline del botón). exitingId arranca recién cuando la llamada
  // ya tuvo éxito, y sólo dura EXIT_DURATION antes del refetch real.
  const [exitingId, setExitingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // useFocusEffect dispara fetchRecordatorios cada vez que se vuelve a esta
  // tab, no sólo al montar — sin este guard, cada refocus tapaba la lista ya
  // cargada con el skeleton completo de nuevo (ver auditoría de refetch).
  const hasLoadedOnceRef = useRef(false);

  const fetchRecordatorios = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setLoading(true);
    setError('');
    try {
      const datos = await getList('/api/recordatorios');
      setRecordatorios(datos);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setLoading(false);
    }
  }, []);

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
      // El endpoint devuelve un string plano en `datos` — no se desestructura,
      // solo importa si la llamada tuvo éxito.
      await api.patch(`/api/recordatorios/${id}/desactivar`);
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

  function confirmDesactivar(id) {
    confirmarDestructivo(
      'Desactivar recordatorio',
      '¿Seguro que querés desactivarlo? Podés seguir viéndolo en el historial, pero dejará de aparecer como pendiente.',
      () => handleDesactivar(id),
      'Desactivar'
    );
  }

  // A diferencia de FamilyListScreen (donde tocar la card lleva a
  // ProfileDetailScreen, que ya tiene su propio botón de editar), acá no
  // existe una segunda pantalla de detalle — así que si el long-press en web
  // degradara directo a "confirmar eliminar" (mismo criterio que
  // FamilyListScreen/ProfileDetailScreen, ver utils/confirm.js: Alert.alert
  // es un no-op en react-native-web y no hay equivalente de 3 botones en las
  // APIs de browser), Editar quedaría inalcanzable del todo en web. Por eso
  // acá Editar tiene su propio ícono de lápiz siempre visible en la fila
  // (mismo patrón que VaccineRow/TreatmentRow en ProfileDetailScreen), y el
  // long-press queda sólo como atajo a Eliminar en todas las plataformas —
  // no necesita branching por Platform.OS porque nunca ofrece Editar.
  function handleLongPress(item) {
    if (dismissingId) return;
    confirmEliminar(item);
  }

  // groupByDate no lee nada fuera de recordatorios (no llama new Date() ni
  // depende de "ahora") — el estado "vencido" se calcula aparte, en
  // renderItem, a partir de parseFechaHora(item.fecha_hora) < new Date() en
  // cada render; memoizar acá por [recordatorios] no lo congela.
  const sections = useMemo(() => groupByDate(recordatorios), [recordatorios]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Calendario"
        subtitle={`${recordatorios.length} recordatorio${recordatorios.length === 1 ? '' : 's'}`}
      />

      {loading ? (
        <View style={styles.listContent}>
          <SkeletonReminderRow />
          <SkeletonReminderRow />
          <SkeletonReminderRow />
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <ErrorBanner message={error} onRetry={fetchRecordatorios} />
        </View>
      ) : recordatorios.length === 0 ? (
        <EmptyState
          message="No tenés recordatorios."
          actionLabel="Agregar recordatorio"
          onAction={() => navigation.navigate('AddReminder')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />
          }
          ListHeaderComponent={
            !!actionError ? (
              <View style={styles.errorWrap}>
                <ErrorBanner message={actionError} onDismiss={() => setActionError('')} />
              </View>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionLabel}>{section.title}</Text>
          )}
          renderItem={({ item, index }) => (
            <FadeSlideIn index={index}>
              <FadeOutRow exiting={exitingId === item.id}>
                <PressScale
                  contentStyle={styles.row}
                  onLongPress={() => handleLongPress(item)}
                  disabled={dismissingId === item.id}
                >
                  <View style={styles.rowMain}>
                    <View style={styles.rowTop}>
                      <TipoBadge
                        tipo={item.tipo}
                        vencido={!!item.activo && parseFechaHora(item.fecha_hora) < new Date()}
                      />
                      <Text style={styles.rowHora}>{formatHora(parseFechaHora(item.fecha_hora))}</Text>
                    </View>
                    {!!item.descripcion && <Text style={styles.rowDescripcion}>{item.descripcion}</Text>}
                  </View>
                  <PressScale
                    contentStyle={styles.editBtn}
                    onPress={() => handleEditar(item)}
                    disabled={dismissingId === item.id}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Editar recordatorio"
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                  </PressScale>
                  <PressScale
                    contentStyle={styles.dismissBtn}
                    onPress={() => confirmDesactivar(item.id)}
                    disabled={dismissingId === item.id}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Cerrar aviso"
                  >
                    {dismissingId === item.id ? (
                      <ActivityIndicator size="small" color={colors.textMuted} />
                    ) : (
                      <Ionicons name="close-outline" size={18} color={colors.textMuted} />
                    )}
                  </PressScale>
                </PressScale>
              </FadeOutRow>
            </FadeSlideIn>
          )}
        />
      )}

      <PressScale
        style={styles.fabPosition}
        contentStyle={styles.fab}
        onPress={() => navigation.navigate('AddReminder')}
        accessibilityLabel="Agregar"
      >
        <Blob size={56} color={colors.blueDeep} extraStyle={[StyleSheet.absoluteFill, shadow]} />
        <Text style={styles.fabIcon}>+</Text>
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  errorWrap: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 100,
  },
  sectionLabel: {
    paddingTop: 18,
    paddingBottom: 8,
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // cardBase (theme/colors.js) — mismo bg/borde/radius/sombra que memberCard
  // (FamilyListScreen) y recordCard (ProfileDetailScreen), consolidado en la
  // auditoría de cards. Sólo el layout row (vs. column en recordCard) es
  // propio de acá.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 10,
    minHeight: 48,
    ...cardBase,
  },
  rowMain: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowHora: {
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
  rowDescripcion: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Posición en su propio bloque (aplicado al Pressable externo de
  // PressScale) — separado de `fab` (forma/color, aplicado al Animated.View
  // interno) porque position:'absolute' en el hijo interno posicionaría
  // relativo a la caja del Pressable (que colapsa en el flujo normal), no
  // relativo a `root`.
  fabPosition: {
    position: 'absolute',
    right: 18,
    // 90 (no 24) — la tab bar flotante (position:'absolute' en MainTabs)
    // se superpondría al FAB si se quedara pegado al borde real.
    bottom: 90,
  },
  // Forma/color/sombra ahora los pinta el Blob (ver JSX) — acá sólo el
  // tamaño de la caja y el centrado del ícono "+" encima.
  fab: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 28,
    color: colors.onAccent,
    lineHeight: 30,
  },
});
