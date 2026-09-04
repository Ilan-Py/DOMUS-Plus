import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, cardBase } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import api, { getList } from '../api/client';
import { useFamily } from '../context/FamilyContext';
import SegmentedControl from '../components/SegmentedControl';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import BackgroundBlobs from '../components/BackgroundBlobs';
import ScreenHeader from '../components/ScreenHeader';
import RadialFab from '../components/RadialFab';
import PressScale from '../components/PressScale';
import Skeleton from '../components/Skeleton';
import { formatLongDate, toSentenceCase } from '../utils/displayFormat';
import { confirmarDestructivo } from '../utils/confirm';
import FadeSlideIn from '../components/FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from '../components/FadeOutRow';

// Silueta de un record-card (VaccineRow/TreatmentRow/HistorialRow) — título +
// una o dos líneas de meta — reutilizando el mismo Skeleton de siempre.
function SkeletonRecordRow() {
  return (
    <View style={styles.recordCard}>
      <Skeleton width="55%" height={15} style={{ marginBottom: 8 }} />
      <Skeleton width="75%" height={12} />
    </View>
  );
}

const TAB_OPTIONS = [
  { label: 'Vacunas', value: 'vacunas' },
  { label: 'Tratamientos', value: 'tratamientos' },
  { label: 'Historial', value: 'historial' },
];

const TIPO_LABELS = { integrante: 'Integrante', mascota: 'Mascota' };

// /api/salud/* espera integrante_id o mascota_id según el dueño — un solo
// helper evita repetir la rama en las tres llamadas.
function ownerQueryParams(tipo, id) {
  return tipo === 'integrante' ? { integrante_id: id } : { mascota_id: id };
}

// onPress del PressScale exterior es un no-op a propósito — no hay nada a
// donde navegar con un tap simple sobre el resto de la card, sólo el
// long-press abre el menú Editar/Eliminar (mismo idioma que MemberCard en
// FamilyListScreen). El guard contra el onPress espurio que Pressable
// dispara al soltar un long-press ya vive centralizado en PressScale, no
// hace falta resolverlo de nuevo acá.
//
// `onEdit` es un botón visible aparte (lápiz en la esquina), no sólo el
// long-press — un gesto oculto sin ninguna pista visual no es un affordance
// real para algo tan importante como editar un registro de salud. Anidar un
// PressScale (el lápiz) dentro de otro (la card entera) es un patrón válido
// en RN: el touch de un tap corto dentro del hitbox del lápiz lo resuelve el
// Pressable interno, no llega al externo.
function VaccineRow({ item, onEdit, onLongPress, disabled }) {
  return (
    <PressScale contentStyle={styles.recordCard} onPress={() => {}} onLongPress={onLongPress} disabled={disabled}>
      <View style={styles.recordHeader}>
        <Text style={[styles.recordTitle, styles.recordTitleFlex]}>{toSentenceCase(item.nombre)}</Text>
        <PressScale
          contentStyle={styles.recordEditBtn}
          onPress={onEdit}
          disabled={disabled}
          hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
          accessibilityLabel={`Editar vacuna ${toSentenceCase(item.nombre)}`}
        >
          <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
        </PressScale>
      </View>
      <Text style={styles.recordMeta}>Aplicada: {formatLongDate(item.fecha_aplicacion)}</Text>
      {!!item.proxima_dosis && (
        <Text style={styles.recordMeta}>Próxima dosis: {formatLongDate(item.proxima_dosis)}</Text>
      )}
      {!!item.notas && <Text style={styles.recordNotes}>{item.notas}</Text>}
    </PressScale>
  );
}

function TreatmentRow({ item, onEdit, onLongPress, disabled }) {
  return (
    <PressScale contentStyle={styles.recordCard} onPress={() => {}} onLongPress={onLongPress} disabled={disabled}>
      <View style={styles.recordHeader}>
        <Text style={[styles.recordTitle, styles.recordTitleFlex]}>{toSentenceCase(item.descripcion)}</Text>
        <PressScale
          contentStyle={styles.recordEditBtn}
          onPress={onEdit}
          disabled={disabled}
          hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
          accessibilityLabel={`Editar tratamiento ${toSentenceCase(item.descripcion)}`}
        >
          <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
        </PressScale>
      </View>
      <Text style={styles.recordMeta}>Medicación: {item.medicacion}</Text>
      <Text style={styles.recordMeta}>
        Desde {formatLongDate(item.fecha_inicio)}
        {item.fecha_fin ? ` hasta ${formatLongDate(item.fecha_fin)}` : ' · en curso'}
      </Text>
    </PressScale>
  );
}

function HistorialRow({ item }) {
  return (
    <View style={styles.recordCard}>
      <Text style={styles.recordTitle}>{item.evento}</Text>
      <Text style={styles.recordMeta}>{formatLongDate(item.fecha)}</Text>
      {!!item.descripcion && <Text style={styles.recordNotes}>{item.descripcion}</Text>}
    </View>
  );
}

export default function ProfileDetailScreen({ navigation, route }) {
  const { id, tipo, member: memberInicial } = route.params;
  const { integrantes, mascotas, refresh } = useFamily();

  // route.params queda congelado al momento de la navegación — si se edita
  // el nombre y se vuelve acá con goBack(), esos params NO se actualizan
  // solos. FamilyContext sí se actualiza (AddMemberScreen llama refresh()
  // antes de goBack()), así que la fuente de verdad para mostrar/editar es
  // siempre la lista viva de useFamily(), buscada por id — memberInicial
  // sólo cubre el primer render, antes de que useFamily() termine de cargar.
  const member =
    (tipo === 'integrante' ? integrantes : mascotas).find((m) => m.id === id) || memberInicial;
  const nombre = tipo === 'integrante' ? `${member?.nombre} ${member?.apellido}` : member?.nombre;

  const [activeTab, setActiveTab] = useState('vacunas');
  const [vacunas, setVacunas] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [recordBusy, setRecordBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Clave `${tipoRegistro}-${id}` de la card en su animación de salida —
  // mismo patrón que FamilyListScreen/CalendarScreen.
  const [exitingKey, setExitingKey] = useState(null);

  function handleEditar() {
    navigation.navigate('AddMember', { tipoMiembro: tipo, memberToEdit: member });
  }

  async function handleEliminarConfirmado() {
    setDeleting(true);
    setError('');
    try {
      const url = tipo === 'integrante' ? `/api/familia/integrantes/${id}` : `/api/familia/mascotas/${id}`;
      await api.delete(url);
      await refresh();
      navigation.goBack();
    } catch (err) {
      setError(err.mensaje);
      setDeleting(false);
    }
  }

  function handleEliminar() {
    confirmarDestructivo(
      'Eliminar',
      `¿Seguro que querés eliminar a ${nombre}? Se perderá su historial de salud asociado.`,
      handleEliminarConfirmado
    );
  }

  // Fade+shift del contenido de abajo al cambiar de tab — Animated.Value
  // propio de esta screen, independiente del highlight de SegmentedControl
  // (ese anima la posición del pill; este anima la lista de registros).
  const contentAnim = useRef(new Animated.Value(1)).current;
  const isFirstTabRef = useRef(true);

  useEffect(() => {
    if (isFirstTabRef.current) {
      // Primer render — el contenido ya arranca visible, sin animar desde
      // un estado que nunca existió.
      isFirstTabRef.current = false;
      return;
    }
    contentAnim.setValue(0);
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true, // opacity + translateY sí son elegibles para el driver nativo
    }).start();
  }, [activeTab, contentAnim]);

  const contentOpacity = contentAnim;
  const contentTranslateY = contentAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  // useFocusEffect dispara fetchAll cada vez que se vuelve a esta pantalla
  // (p. ej. al volver de AddVaccine/AddTreatment), no sólo al montar — sin
  // este guard, cada refocus tapaba las listas ya cargadas con el skeleton
  // completo de nuevo.
  const hasLoadedOnceRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setLoading(true);
    setError('');
    try {
      const params = ownerQueryParams(tipo, id);
      const [datosVacunas, datosTratamientos, datosHistorial] = await Promise.all([
        getList('/api/salud/vacunas', { params }),
        getList('/api/salud/tratamientos', { params }),
        getList('/api/salud/historial', { params }),
      ]);
      setVacunas(datosVacunas);
      setTratamientos(datosTratamientos);
      setHistorial(datosHistorial);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setLoading(false);
    }
  }, [id, tipo]);

  // Se ejecuta al entrar y cada vez que la pantalla vuelve a tener foco
  // (p. ej. al volver de AddVaccine/AddTreatment una vez existan en UI-3).
  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

  const ownerParams = { ownerId: id, ownerTipo: tipo, ownerNombre: nombre };

  // Editar/eliminar de un registro de vacuna/tratamiento — mismo idioma de
  // long-press + Alert.alert que MemberCard en FamilyListScreen. `editando`
  // reusa el mismo param que ya arma ownerField/POST en AddVaccine/
  // AddTreatment (ver esos archivos), así el form pre-llena y branchea a
  // PATCH sin tocar nada del resto del flujo de creación.
  function handleEditarRegistro(tipoRegistro, item) {
    const screen = tipoRegistro === 'vacuna' ? 'AddVaccine' : 'AddTreatment';
    navigation.navigate(screen, { ...ownerParams, editando: item });
  }

  async function handleEliminarRegistro(tipoRegistro, item) {
    setRecordBusy(true);
    setError('');
    try {
      const url =
        tipoRegistro === 'vacuna' ? `/api/salud/vacunas/${item.id}` : `/api/salud/tratamientos/${item.id}`;
      await api.delete(url);
      setExitingKey(`${tipoRegistro}-${item.id}`);
      await new Promise((resolve) => setTimeout(resolve, EXIT_DURATION));
      // Mismo fetchAll ya usado por useFocusEffect — no se duplica la
      // llamada a las tres listas, sólo se vuelve a disparar.
      await fetchAll();
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setRecordBusy(false);
      setExitingKey(null);
    }
  }

  function confirmEliminarRegistro(tipoRegistro, item, nombreRegistro) {
    confirmarDestructivo('Eliminar', `¿Seguro que querés eliminar ${nombreRegistro}?`, () =>
      handleEliminarRegistro(tipoRegistro, item)
    );
  }

  // El menú de 3 opciones (Editar/Eliminar/Cancelar) sólo tiene sentido vía
  // Alert.alert nativo — no hay equivalente limpio de 3 botones en las APIs
  // de browser. En web, editar ya tiene su propio botón visible en la card
  // (ver VaccineRow/TreatmentRow) y no depende de este menú en ningún
  // platform, así que ahí el long-press degrada directo a "confirmar
  // eliminar" (con confirmación real vía window.confirm) en vez de no hacer
  // nada en silencio.
  function handleLongPressRegistro(tipoRegistro, item, nombreRegistro) {
    if (recordBusy) return;
    if (Platform.OS === 'web') {
      confirmEliminarRegistro(tipoRegistro, item, nombreRegistro);
      return;
    }
    Alert.alert(
      nombreRegistro,
      undefined,
      [
        { text: 'Editar', onPress: () => handleEditarRegistro(tipoRegistro, item) },
        { text: 'Eliminar', style: 'destructive', onPress: () => confirmEliminarRegistro(tipoRegistro, item, nombreRegistro) },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }

  // El historial no tiene pantalla de alta propia (se genera a partir de
  // vacunas/tratamientos) — el FAB sólo aparece en las tabs que sí la tienen,
  // y apunta a la que corresponde según la tab activa.
  const fabTarget =
    activeTab === 'vacunas' ? 'AddVaccine' : activeTab === 'tratamientos' ? 'AddTreatment' : null;

  return (
    <View style={styles.root}>
      <BackgroundBlobs />

      <ScreenHeader
        title={nombre}
        subtitle={TIPO_LABELS[tipo] ?? tipo}
        subtitleStyle={styles.topbarSubt}
        onBack={() => navigation.goBack()}
        rightActions={
          <>
            <PressScale
              contentStyle={styles.topbarIconBtn}
              onPress={handleEditar}
              disabled={deleting}
              hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
              accessibilityLabel="Editar"
            >
              <Ionicons name="pencil-outline" size={18} color={colors.navy} />
            </PressScale>
            <PressScale
              contentStyle={styles.topbarIconBtn}
              onPress={handleEliminar}
              disabled={deleting}
              hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
              accessibilityLabel="Eliminar"
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </PressScale>
          </>
        }
      />

      <SegmentedControl
        options={TAB_OPTIONS}
        selectedValue={activeTab}
        onChange={setActiveTab}
        style={styles.tabs}
      />

      {loading ? (
        <View style={styles.scroll}>
          <SkeletonRecordRow />
          <SkeletonRecordRow />
          <SkeletonRecordRow />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />
          }
        >
          {!!error && (
            <View style={styles.errorWrap}>
              <ErrorBanner message={error} onRetry={fetchAll} />
            </View>
          )}

          <Animated.View
            style={[
              styles.tabContent,
              { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
            ]}
          >
            {!error && activeTab === 'vacunas' && (
              vacunas.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <EmptyState message="No hay vacunas registradas." />
                </View>
              ) : (
                vacunas.map((item, i) => {
                  const key = `vacuna-${item.id}`;
                  return (
                    <FadeSlideIn key={key} index={i}>
                      <FadeOutRow exiting={exitingKey === key}>
                        <VaccineRow
                          item={item}
                          disabled={recordBusy}
                          onEdit={() => handleEditarRegistro('vacuna', item)}
                          onLongPress={() => handleLongPressRegistro('vacuna', item, toSentenceCase(item.nombre))}
                        />
                      </FadeOutRow>
                    </FadeSlideIn>
                  );
                })
              )
            )}

            {!error && activeTab === 'tratamientos' && (
              tratamientos.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <EmptyState message="No hay tratamientos registrados." />
                </View>
              ) : (
                tratamientos.map((item, i) => {
                  const key = `tratamiento-${item.id}`;
                  return (
                    <FadeSlideIn key={key} index={i}>
                      <FadeOutRow exiting={exitingKey === key}>
                        <TreatmentRow
                          item={item}
                          disabled={recordBusy}
                          onEdit={() => handleEditarRegistro('tratamiento', item)}
                          onLongPress={() => handleLongPressRegistro('tratamiento', item, toSentenceCase(item.descripcion))}
                        />
                      </FadeOutRow>
                    </FadeSlideIn>
                  );
                })
              )
            )}

            {!error && activeTab === 'historial' && (
              historial.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <EmptyState message="No hay eventos en el historial." />
                </View>
              ) : (
                historial.map((item, i) => (
                  <FadeSlideIn key={item.id} index={i}>
                    <HistorialRow item={item} />
                  </FadeSlideIn>
                ))
              )
            )}
          </Animated.View>
        </ScrollView>
      )}

      <RadialFab
        style={styles.fab}
        onPress={fabTarget ? () => navigation.navigate(fabTarget, ownerParams) : null}
        options={[
          {
            key: 'vacuna',
            icon: 'medical-outline',
            label: 'Vacuna',
            bg: colors.avatarAdultBg,
            fg: colors.avatarAdultText,
            onPress: () => navigation.navigate('AddVaccine', ownerParams),
          },
          {
            key: 'tratamiento',
            icon: 'medkit-outline',
            label: 'Tratamiento',
            bg: colors.lime,
            fg: colors.ink,
            onPress: () => navigation.navigate('AddTreatment', ownerParams),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  // Mismo tamaño/forma que el backBtn de ScreenHeader (40x40, pill,
  // glassStrong) — los tres botones del topbar (volver/editar/eliminar)
  // comparten un solo lenguaje visual de "ícono en burbuja". Se queda local
  // acá (no se sube a ScreenHeader) porque es específico de las acciones de
  // este screen, pasadas vía `rightActions`.
  topbarIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Override de ScreenHeader.topbarSubt (default 12px/textMuted, sin
  // Poppins) — este screen ya usaba un subtítulo distinto (12.5px/400/
  // Poppins/textMutedLight) antes de migrar a ScreenHeader. Drift
  // preexistente entre las 3 copias hand-rolled, preservado acá en vez de
  // unificarse silenciosamente durante la migración.
  topbarSubt: {
    fontSize: 12.5,
    fontWeight: '400',
    fontFamily: poppinsWeight('400'),
    color: colors.textMutedLight,
    marginTop: 1,
  },
  tabs: {
    marginHorizontal: 18,
    marginTop: 16,
    marginBottom: 0,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    // 100 (no 40) para despejar la tab bar flotante (position:'absolute' en
    // MainTabs) — mismo valor que CalendarScreen/FamilyListScreen.
    paddingBottom: 100,
  },
  errorWrap: {
    paddingBottom: 8,
  },
  // flex:1 acá (no sólo en emptyWrap) — este wrapper Animated.View quedó
  // entre el ScrollView y emptyWrap; sin flex:1 acá, el flex:1 de emptyWrap
  // no tendría contra qué crecer y el estado vacío dejaría de centrarse.
  tabContent: {
    flex: 1,
  },
  // El branch vacío es el único hijo directo de tabContent cuando está
  // activo — flex:1 + el flexGrow del scroll le da alto real para
  // centrarse en vez de quedar pegado arriba con espacio muerto debajo.
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // cardBase (theme/colors.js) — mismo bg/borde/radius/sombra que memberCard
  // (FamilyListScreen) y row (CalendarScreen), consolidado en la auditoría de
  // cards. Sólo el layout de contenido (padding column, no row) es propio de
  // acá.
  recordCard: {
    padding: 14,
    marginBottom: 10,
    ...cardBase,
  },
  // Fila título+lápiz — sólo lo necesario para alinear el affordance nuevo,
  // no se toca el resto del layout de la card.
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  recordTitleFlex: {
    flex: 1,
  },
  recordEditBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
    marginRight: -4,
  },
  recordTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
  recordMeta: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 3,
  },
  recordNotes: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  // Sólo posición acá — RadialFab trae su propio tamaño/forma/sombra.
  fab: {
    position: 'absolute',
    right: 18,
    // 90 (no 24) — la tab bar flotante (position:'absolute' en MainTabs)
    // se superpondría al FAB si se quedara pegado al borde real.
    bottom: 90,
  },
});
