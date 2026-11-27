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
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import api, { getList } from '../api/client';
import { useFamily } from '../context/FamilyContext';
import SegmentedControl from '../components/SegmentedControl';
import ErrorBanner from '../components/ErrorBanner';
import InlineError from '../components/InlineError';
import PressScale from '../components/PressScale';
import PrimaryButton from '../components/PrimaryButton';
import Skeleton from '../components/Skeleton';
import Avatar from '../components/Avatar';
import { EmptyDoodle } from '../components/FamilyDoodles';
import EmergencySummary from '../components/EmergencySummary';
import { formatLongDate, parseApiDate, toSentenceCase } from '../utils/displayFormat';
import { confirmarDestructivo } from '../utils/confirm';
import FadeSlideIn from '../components/FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from '../components/FadeOutRow';
import AttachmentsSection from '../components/AttachmentsSection';
import ProfessionalContactsSection from '../components/ProfessionalContactsSection';

// Layout: ver frontend/DESIGN.md. Desde 1024px, dos columnas (64% / 36%) en un
// contenedor de hasta 1120px; debajo, una sola columna apilada.
const DESKTOP_BREAKPOINT = 1024;
const CONTAINER_MAX_WIDTH = 1120;

const TAB_OPTIONS = [
  { label: 'Vacunas', value: 'vacunas' },
  { label: 'Tratamientos', value: 'tratamientos' },
  { label: 'Historial', value: 'historial' },
];

const TIPO_LABELS = { adulto: 'Adulto', menor: 'Menor', mayor: 'Mayor' };

function calcularEdad(fechaNacimiento) {
  const nacimiento = parseApiDate(fechaNacimiento);
  if (!nacimiento) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const cumplio =
    hoy.getMonth() > nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate());
  if (!cumplio) edad -= 1;
  return edad >= 0 ? edad : null;
}

// /api/salud/* espera integrante_id o mascota_id según el dueño — un solo
// helper evita repetir la rama en las tres llamadas.
function ownerQueryParams(tipo, id) {
  return tipo === 'integrante' ? { integrante_id: id } : { mascota_id: id };
}

function SkeletonRecordRow() {
  return (
    <View style={styles.recordCard}>
      <Skeleton width="55%" height={18} style={{ marginBottom: 8 }} />
      <Skeleton width="75%" height={14} />
    </View>
  );
}

// Botón de la cabecera (Editar / Eliminar): misma altura, forma y borde, con
// ícono + etiqueta visible.
function HeaderAction({ icon, label, onPress, disabled, danger, style }) {
  const color = danger ? colors.limeDeep : colors.ink;
  return (
    <PressScale
      style={style}
      contentStyle={[styles.headerAction, style && styles.fullWidth]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={danger ? colors.limeDeep : colors.iconWarm} />
      <Text style={[styles.headerActionText, { color }]}>{label}</Text>
    </PressScale>
  );
}

function Card({ children, style, plain }) {
  return <View style={[styles.card, plain && styles.cardPlain, style]}>{children}</View>;
}

function CardTitle({ children }) {
  return (
    <Text style={styles.cardTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

// `onEdit` es un botón visible aparte (lápiz), no sólo el long-press: un
// gesto oculto no es un affordance real para editar un registro de salud.
function VaccineRow({ item, onEdit, onLongPress, disabled }) {
  return (
    <PressScale contentStyle={styles.recordCard} onPress={() => {}} onLongPress={onLongPress} disabled={disabled}>
      <View style={styles.recordHeader}>
        <Text style={[styles.recordTitle, styles.recordTitleFlex]}>{toSentenceCase(item.nombre)}</Text>
        <PressScale
          contentStyle={styles.recordEditBtn}
          onPress={onEdit}
          disabled={disabled}
          accessibilityLabel={`Editar vacuna ${toSentenceCase(item.nombre)}`}
        >
          <Ionicons name="pencil-outline" size={20} color={colors.iconWarm} />
        </PressScale>
      </View>
      <Text style={styles.recordMeta}>Aplicada: {formatLongDate(item.fecha_aplicacion)}</Text>
      {!!item.proxima_dosis && (
        <Text style={styles.recordMeta}>Próxima dosis: {formatLongDate(item.proxima_dosis)}</Text>
      )}
      {!!item.notas && <Text style={styles.recordNotes}>{item.notas}</Text>}
      <AttachmentsSection parentType="vacuna" parentId={item.id} label="Documentos de esta vacuna" compact addLabel="Adjuntar" />
    </PressScale>
  );
}

// Un tratamiento sigue "activo" mientras no tenga fecha_fin, o mientras esa
// fecha no haya pasado — el día de fin cuenta como activo. fecha_fin es una
// columna DATE: se parsea con parseApiDate (ver utils/displayFormat.js).
function esTratamientoActivo(fechaFin) {
  const fin = parseApiDate(fechaFin);
  if (!fin) return true;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fin.getTime() >= hoy.getTime();
}

function TreatmentRow({ item, onEdit, onLongPress, disabled }) {
  const activo = esTratamientoActivo(item.fecha_fin);
  return (
    <PressScale contentStyle={styles.recordCard} onPress={() => {}} onLongPress={onLongPress} disabled={disabled}>
      <View style={styles.recordHeader}>
        <Text style={[styles.recordTitle, styles.recordTitleFlex]}>{toSentenceCase(item.descripcion)}</Text>
        <View style={[styles.statusBadge, !activo && styles.statusBadgeInactive]}>
          <Text style={[styles.statusBadgeText, !activo && styles.statusBadgeTextInactive]}>
            {activo ? 'Activo' : 'Finalizado'}
          </Text>
        </View>
        <PressScale
          contentStyle={styles.recordEditBtn}
          onPress={onEdit}
          disabled={disabled}
          accessibilityLabel={`Editar tratamiento ${toSentenceCase(item.descripcion)}`}
        >
          <Ionicons name="pencil-outline" size={20} color={colors.iconWarm} />
        </PressScale>
      </View>
      <Text style={styles.recordMeta}>Medicación: {item.medicacion}</Text>
      <Text style={styles.recordMeta}>
        Desde {formatLongDate(item.fecha_inicio)}
        {item.fecha_fin ? ` hasta ${formatLongDate(item.fecha_fin)}` : ' · en curso'}
      </Text>
      <AttachmentsSection parentType="tratamiento" parentId={item.id} label="Documentos de este tratamiento" compact addLabel="Adjuntar" />
    </PressScale>
  );
}

function HistorialRow({ item }) {
  return (
    <View style={styles.recordCard}>
      <Text style={styles.recordTitle}>{item.evento}</Text>
      <Text style={styles.recordMeta}>{formatLongDate(item.fecha)}</Text>
      {!!item.descripcion && <Text style={styles.recordNotes}>{item.descripcion}</Text>}
      <AttachmentsSection parentType="historial" parentId={item.id} label="Documentos de este evento" compact addLabel="Adjuntar" />
    </View>
  );
}

// Estado vacío: ícono en círculo suave, texto claro y (si corresponde) el botón
// de agregar centrado debajo.
function EmptyBlock({ doodle = 'hojas', message, actionLabel, onAction }) {
  return (
    <View style={styles.empty}>
      <EmptyDoodle variant={doodle} size={64} />
      <Text style={styles.emptyText}>{message}</Text>
      {!!actionLabel && (
        <View style={styles.emptyAction}>
          <PrimaryButton title={actionLabel} variant="accent" fullWidth={false} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

export default function ProfileDetailScreen({ navigation, route }) {
  const { id, tipo, member: memberInicial } = route.params;
  const { integrantes, mascotas, refresh } = useFamily();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= DESKTOP_BREAKPOINT;

  // route.params queda congelado al momento de la navegación — la fuente de
  // verdad para mostrar/editar es la lista viva de useFamily(), buscada por
  // id; memberInicial sólo cubre el primer render.
  const member =
    (tipo === 'integrante' ? integrantes : mascotas).find((m) => m.id === id) || memberInicial;
  const nombre = tipo === 'integrante' ? `${member?.nombre} ${member?.apellido}` : member?.nombre;

  const edad = tipo === 'integrante' ? calcularEdad(member?.fecha_nacimiento) : null;
  const subtitulo =
    tipo === 'integrante'
      ? `${TIPO_LABELS[member?.tipo] ?? 'Integrante'}${edad !== null ? ` · ${edad} años` : ''}`
      : `${member?.especie || 'Mascota'} · Mascota`;

  const [activeTab, setActiveTab] = useState('vacunas');
  const [vacunas, setVacunas] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recordBusy, setRecordBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Clave `${tipoRegistro}-${id}` de la card en su animación de salida.
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

  // Fade+shift del contenido al cambiar de pestaña.
  const contentAnim = useRef(new Animated.Value(1)).current;
  const isFirstTabRef = useRef(true);

  useEffect(() => {
    if (isFirstTabRef.current) {
      isFirstTabRef.current = false;
      return;
    }
    contentAnim.setValue(0);
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [activeTab, contentAnim]);

  const contentTranslateY = contentAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  // useFocusEffect dispara fetchAll cada vez que se vuelve a esta pantalla
  // (p. ej. al volver de AddVaccine/AddTreatment), no sólo al montar.
  const hasLoadedOnceRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setLoading(true);
    setError('');
    setLoadError(false);
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
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id, tipo]);

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

  // Menú Editar/Eliminar/Cancelar sólo vía Alert nativo; en web el long-press
  // degrada directo a "confirmar eliminar" (Editar tiene su botón visible).
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

  // El historial no tiene pantalla de alta propia: el botón de agregar sólo
  // existe en las pestañas que sí la tienen.
  const addTarget =
    activeTab === 'vacunas' ? 'AddVaccine' : activeTab === 'tratamientos' ? 'AddTreatment' : null;
  const addLabel = activeTab === 'vacunas' ? '+ Agregar vacuna' : '+ Agregar tratamiento';
  const irAAgregar = () => navigation.navigate(addTarget, ownerParams);

  const total = activeTab === 'vacunas' ? vacunas.length : activeTab === 'tratamientos' ? tratamientos.length : historial.length;
  const totalLabel =
    activeTab === 'vacunas'
      ? `${total} ${total === 1 ? 'vacuna' : 'vacunas'}`
      : activeTab === 'tratamientos'
        ? `${total} ${total === 1 ? 'tratamiento' : 'tratamientos'}`
        : `${total} ${total === 1 ? 'evento' : 'eventos'}`;

  // ---------------- bloques ----------------
  const header = (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <PressScale contentStyle={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
          <Text style={styles.backText}>Volver</Text>
        </PressScale>
      </View>

      <View style={styles.identity}>
        <Avatar
          nombre={member?.nombre}
          apellido={member?.apellido}
          size={56}
          mascota={tipo === 'mascota'}
          tipo={member?.tipo}
          fotoUrl={member?.foto_url}
        />
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={2} accessibilityRole="header">
            {nombre}
          </Text>
          <Text style={styles.subtitle}>{subtitulo}</Text>
        </View>
        {desktop && (
          <View style={styles.headerActionsDesktop}>
            <HeaderAction icon="pencil-outline" label="Editar" onPress={handleEditar} disabled={deleting} />
            <HeaderAction icon="trash-outline" label="Eliminar" onPress={handleEliminar} disabled={deleting} danger />
          </View>
        )}
      </View>

      {!desktop && (
        <View style={styles.headerActionsMobile}>
          <HeaderAction icon="pencil-outline" label="Editar" onPress={handleEditar} disabled={deleting} style={styles.flex1} />
          <HeaderAction icon="trash-outline" label="Eliminar" onPress={handleEliminar} disabled={deleting} danger style={styles.flex1} />
        </View>
      )}
    </View>
  );

  const emergencyCard =
    tipo === 'integrante' ? (
      <Card>
        <CardTitle>Emergencia</CardTitle>
        <EmergencySummary
          integrante={member}
          integranteId={id}
          onAbrirFicha={() => navigation.navigate('Emergency', { id, nombre })}
        />
      </Card>
    ) : null;

  // Sin fondo ni borde propio: las tarjetas de cada registro apoyan directo sobre el fondo crema.
  const trackingCard = (
    <Card plain>
      <CardTitle>Seguimiento médico</CardTitle>
      <SegmentedControl
        options={TAB_OPTIONS}
        selectedValue={activeTab}
        onChange={setActiveTab}
        style={styles.tabs}
      />

      {!!error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {loading ? (
        <View style={styles.list}>
          <SkeletonRecordRow />
          <SkeletonRecordRow />
        </View>
      ) : loadError ? (
        <InlineError message="No pudimos cargar el seguimiento médico." onRetry={fetchAll} />
      ) : (
        <>
          {!!addTarget && total > 0 && (
            <View style={styles.tabHeader}>
              <Text style={styles.tabCount}>{totalLabel}</Text>
              <PrimaryButton title={addLabel} variant="accent" fullWidth={!desktop} onPress={irAAgregar} />
            </View>
          )}

          <Animated.View
            style={[styles.list, { opacity: contentAnim, transform: [{ translateY: contentTranslateY }] }]}
          >
            {activeTab === 'vacunas' &&
              (vacunas.length === 0 ? (
                <EmptyBlock
                  doodle="hojas"
                  message="No hay vacunas registradas."
                  actionLabel={addLabel}
                  onAction={irAAgregar}
                />
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
              ))}

            {activeTab === 'tratamientos' &&
              (tratamientos.length === 0 ? (
                <EmptyBlock
                  doodle="documento"
                  message="No hay tratamientos registrados."
                  actionLabel={addLabel}
                  onAction={irAAgregar}
                />
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
              ))}

            {activeTab === 'historial' &&
              (historial.length === 0 ? (
                <EmptyBlock doodle="calendario" message="No hay eventos en el historial." />
              ) : (
                historial.map((item, i) => (
                  <FadeSlideIn key={item.id} index={i}>
                    <HistorialRow item={item} />
                  </FadeSlideIn>
                ))
              ))}
          </Animated.View>
        </>
      )}
    </Card>
  );

  const professionalsCard = (
    <Card>
      <ProfessionalContactsSection parentType={tipo} parentId={id} />
    </Card>
  );

  const documentsCard = (
    <Card>
      <AttachmentsSection
        parentType={tipo}
        parentId={id}
        label="Documentos generales"
        hint="Estudios y recetas que no son de una vacuna o tratamiento en particular."
        addLabel="Adjuntar documento"
      />
    </Card>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          desktop ? styles.scrollDesktop : styles.scrollMobile,
          { paddingTop: (desktop ? 24 : 12) + insets.top },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />
        }
      >
        <View style={styles.container}>
          {header}

          {desktop ? (
            <View style={styles.columns}>
              <View style={styles.colLeft}>{trackingCard}</View>
              <View style={styles.colRight}>
                {emergencyCard}
                {professionalsCard}
                {documentsCard}
              </View>
            </View>
          ) : (
            <View style={styles.stack}>
              {emergencyCard}
              {trackingCard}
              {professionalsCard}
              {documentsCard}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  flex1: { flex: 1 },
  fullWidth: { width: '100%' },
  scroll: { paddingBottom: 112 },
  scrollDesktop: { paddingHorizontal: 32 },
  scrollMobile: { paddingHorizontal: 20 },
  container: { width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center' },

  // ---- header ----
  header: { marginBottom: 24, gap: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingRight: 16 },
  backText: { fontSize: 16, fontFamily: poppinsWeight('400'), color: colors.ink },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identityText: { flex: 1 },
  name: { fontSize: 24, lineHeight: 32, fontFamily: poppinsWeight('700'), color: colors.ink },
  subtitle: { fontSize: 16, lineHeight: 22, color: colors.textBody, marginTop: 4 },
  headerActionsDesktop: { flexDirection: 'row', gap: 12 },
  headerActionsMobile: { flexDirection: 'row', gap: 12 },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  headerActionText: { fontSize: 16, fontFamily: poppinsWeight('600') },

  // ---- layout ----
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  colLeft: { flex: 64 },
  colRight: { flex: 36, minWidth: 300, gap: 16 },
  stack: { gap: 16 },

  // ---- tarjetas ----
  card: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
    padding: 20,
  },
  cardPlain: { backgroundColor: 'transparent', borderWidth: 0, padding: 0 },
  cardTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: poppinsWeight('700'),
    color: colors.ink,
    marginBottom: 12,
  },
  tabs: { marginHorizontal: 0, marginTop: 4, marginBottom: 16 },
  tabHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  tabCount: { fontSize: 16, color: colors.textBody },
  list: { gap: 12 },

  // ---- registros ----
  recordCard: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  recordHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordTitle: { fontSize: 17, lineHeight: 24, fontFamily: poppinsWeight('700'), color: colors.ink },
  recordTitleFlex: { flex: 1 },
  recordEditBtn: { width: 48, height: 48, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  recordMeta: { fontVariant: ['tabular-nums'], fontSize: 15, lineHeight: 22, color: colors.textBody },
  recordNotes: { fontSize: 15, lineHeight: 22, color: colors.textBody, marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.sage,
  },
  statusBadgeInactive: { backgroundColor: colors.badgeSand },
  statusBadgeText: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.sageDeep },
  statusBadgeTextInactive: { color: colors.badgeSandText },

  // ---- estado vacío ----
  empty: { alignItems: 'center', paddingVertical: 24, gap: 12 },
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
