import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow, glassShadow, reminderBadge } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import api, { getList } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import PressScale from '../components/PressScale';
import Skeleton from '../components/Skeleton';
import { cancelarNotificacion } from '../utils/notifications';
import { parseFechaHora } from '../utils/displayFormat';
import { confirmarDestructivo } from '../utils/confirm';

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

function TipoBadge({ tipo }) {
  const badge = reminderBadge[tipo];
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Text style={[styles.badgeText, { color: badge.text }]}>{TIPO_LABELS[tipo] ?? tipo}</Text>
    </View>
  );
}

export default function CalendarScreen({ navigation }) {
  const [recordatorios, setRecordatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [dismissingId, setDismissingId] = useState(null);

  const fetchRecordatorios = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const datos = await getList('/api/recordatorios');
      setRecordatorios(datos);
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

  async function handleDesactivar(id) {
    setActionError('');
    setDismissingId(id);
    try {
      // El endpoint devuelve un string plano en `datos` — no se desestructura,
      // solo importa si la llamada tuvo éxito.
      await api.patch(`/api/recordatorios/${id}/desactivar`);
      await cancelarNotificacion(id);
      await fetchRecordatorios();
    } catch (err) {
      setActionError(err.mensaje);
    } finally {
      setDismissingId(null);
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
      await fetchRecordatorios();
    } catch (err) {
      setActionError(err.mensaje);
    } finally {
      setDismissingId(null);
    }
  }

  function confirmEliminar(item) {
    confirmarDestructivo(
      'Eliminar recordatorio',
      `¿Seguro que querés eliminar este recordatorio${item.descripcion ? ` ("${item.descripcion}")` : ''}?`,
      () => handleEliminar(item.id)
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

  const sections = groupByDate(recordatorios);

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>Calendario</Text>
        <Text style={styles.topbarSubt}>
          {recordatorios.length} recordatorio{recordatorios.length === 1 ? '' : 's'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.listContent}>
          <SkeletonReminderRow />
          <SkeletonReminderRow />
          <SkeletonReminderRow />
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <ErrorBanner message={error} />
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
          renderItem={({ item }) => (
            <PressScale
              contentStyle={styles.row}
              onLongPress={() => handleLongPress(item)}
              disabled={dismissingId === item.id}
            >
              <View style={styles.rowMain}>
                <View style={styles.rowTop}>
                  <TipoBadge tipo={item.tipo} />
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
                onPress={() => handleDesactivar(item.id)}
                disabled={dismissingId === item.id}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Cerrar aviso"
              >
                {dismissingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <Text style={styles.dismissIcon}>✕</Text>
                )}
              </PressScale>
            </PressScale>
          )}
        />
      )}

      <PressScale
        style={styles.fabPosition}
        contentStyle={styles.fab}
        onPress={() => navigation.navigate('AddReminder')}
        accessibilityLabel="Agregar"
      >
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
  topbar: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 16,
    // bgBase (no colors.glass, que ahora es blanco puro) — mismo criterio
    // que el resto de los headers, ver FamilyListScreen.js.
    backgroundColor: colors.bgBase,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  topbarTitle: {
    fontSize: 19,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
  topbarSubt: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
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
  // ...glassShadow — mismo fix de sombra que ProfileDetailScreen.recordCard:
  // sin esto la fila leía plana contra el crema (auditoría de sombras, ver
  // resumen de la pasada de polish).
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 10,
    minHeight: 48,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    ...glassShadow,
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
  dismissIcon: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
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
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blueDeep,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.onAccent,
    lineHeight: 30,
  },
});
