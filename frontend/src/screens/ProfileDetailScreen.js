import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Easing, RefreshControl, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import { color, espacio, radio, tactil } from '../theme/tokens';
import api, { getList } from '../api/client';
import { useFamily } from '../context/FamilyContext';
import ErrorBanner from '../components/ErrorBanner';
import InlineError from '../components/InlineError';
import PressScale from '../components/PressScale';
import PrimaryButton from '../components/PrimaryButton';
import Skeleton from '../components/Skeleton';
import PaperCard from '../components/PaperCard';
import Ilustracion from '../components/Ilustracion';
import PostIt from '../components/PostIt';
import EmergencySummary from '../components/EmergencySummary';
import { mostrarToast } from '../components/ToastHost';
import { formatLongDate, parseApiDate } from '../utils/displayFormat';
import { confirmarDestructivo, elegirOpcion } from '../utils/confirm';
import { edadDe, plural } from '../utils/formato';
import FadeSlideIn from '../components/FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from '../components/FadeOutRow';
import AttachmentsSection from '../components/AttachmentsSection';
import ProfessionalContactsSection from '../components/ProfessionalContactsSection';
import {
  EscenaFicha,
  MarcoPolaroid,
  PestanasFichero,
  StickerVacuna,
  GraficoPeso,
  LineaDeTiempo,
  armarLineaDeTiempo,
  estadoVacuna,
  fechaNumerica,
} from '../components/Libreta';

// Ficha de un integrante o una mascota como su LIBRETA SANITARIA (ronda de ajustes de la ficha):
//  - cabecera como escena de papel, con la foto en un marco polaroid (o una ilustración, nunca un ícono gris), la
//    ficha rápida en chips y, si hay, la nota humana como post-it (una sola);
//  - pestañas de fichero con contadores; cada vacuna es un sticker con su sello de estado y la próxima dosis;
//  - historial como línea de tiempo; peso con gráfico; veterinario con «Llamar» y «WhatsApp»;
//  - «Eliminar» fuera de la vista principal (menú «⋯», con confirmación).
// Mismo ancho de contenido que Familia y Calendario (65 / 35 desde 1024 px).
const DESKTOP_BREAKPOINT = 1024;
const CONTAINER_MAX_WIDTH = 1440;

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

function esTratamientoActivo(fechaFin) {
  const fin = parseApiDate(fechaFin);
  if (!fin) return true;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fin.getTime() >= hoy.getTime();
}

function TreatmentRow({ item, onEdit, disabled }) {
  const activo = esTratamientoActivo(item.fecha_fin);
  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordIcono}>
          <MaterialCommunityIcons name="pill" size={18} color="#8E3A2A" />
        </View>
        <Text style={[styles.recordTitle, styles.recordTitleFlex]}>{item.medicacion}</Text>
        <View style={[styles.statusBadge, !activo && styles.statusBadgeInactive]}>
          <Text style={[styles.statusBadgeText, !activo && styles.statusBadgeTextInactive]}>{activo ? 'En curso' : 'Terminado'}</Text>
        </View>
        <PressScale contentStyle={styles.recordEditBtn} onPress={onEdit} disabled={disabled} accessibilityLabel={`Editar tratamiento ${item.medicacion}`}>
          <Ionicons name="pencil-outline" size={20} color={colors.iconWarm} />
        </PressScale>
      </View>
      <Text style={styles.recordMeta}>{item.descripcion}</Text>
      <Text style={styles.recordMeta}>
        Desde {formatLongDate(item.fecha_inicio)}
        {item.fecha_fin ? ` hasta ${formatLongDate(item.fecha_fin)}` : ' · sin fecha de fin'}
      </Text>
      <AttachmentsSection parentType="tratamiento" parentId={item.id} label="Recetas y estudios" compact addLabel="Adjuntar" />
    </View>
  );
}

// Estado vacío con nombre y una escena chica de papel.
function Vacio({ ilustracion, titulo, texto, accion, onAccion }) {
  return (
    <View style={styles.empty}>
      <Ilustracion nombre={ilustracion} size={120} />
      <Text style={styles.emptyTitulo}>{titulo}</Text>
      <Text style={styles.emptyText}>{texto}</Text>
      {!!accion && (
        <View style={styles.emptyAction}>
          <PrimaryButton title={accion} variant="accent" fullWidth={false} onPress={onAccion} />
        </View>
      )}
    </View>
  );
}

// «Bruno está al día con sus vacunas» / «A Bruno le vence la Antirrábica el 28/11/2027» / «Bruno tiene 1 vacuna vencida».
function fraseVacunas(nombre, vacunas) {
  if (!vacunas.length) return null;
  const vencidas = vacunas.filter((v) => estadoVacuna(v) === 'vencida');
  if (vencidas.length) return { tono: 'alerta', texto: `${nombre} tiene ${plural(vencidas.length, 'vacuna vencida', 'vacunas vencidas')}: ${vencidas.map((v) => v.nombre).join(', ')}.` };
  const pronto = vacunas.filter((v) => estadoVacuna(v) === 'pronto').sort((a, b) => parseApiDate(a.proxima_dosis) - parseApiDate(b.proxima_dosis))[0];
  if (pronto) return { tono: 'aviso', texto: `A ${nombre} le toca la ${pronto.nombre} el ${fechaNumerica(pronto.proxima_dosis)}.` };
  const conProxima = vacunas.filter((v) => v.proxima_dosis);
  if (!conProxima.length) return { tono: 'neutro', texto: `Ninguna vacuna de ${nombre} tiene la próxima dosis cargada.` };
  return { tono: 'ok', texto: `${nombre} está al día con sus vacunas.` };
}

export default function ProfileDetailScreen({ navigation, route }) {
  const { id, tipo, member: memberInicial } = route.params;
  const { integrantes, mascotas, refresh } = useFamily();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= DESKTOP_BREAKPOINT;
  const esMascota = tipo === 'mascota';

  const member = (tipo === 'integrante' ? integrantes : mascotas).find((m) => m.id === id) || memberInicial;
  const nombre = tipo === 'integrante' ? `${member?.nombre} ${member?.apellido}` : member?.nombre;
  const corto = member?.nombre || '';

  const [activeTab, setActiveTab] = useState('vacunas');
  const [vacunas, setVacunas] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [pesos, setPesos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recordBusy, setRecordBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exitingKey] = useState(null);

  function handleEditar() {
    navigation.navigate('AddMember', { tipoMiembro: tipo, memberToEdit: member });
  }

  async function handleEliminarConfirmado() {
    setDeleting(true);
    setError('');
    try {
      await api.delete(tipo === 'integrante' ? `/api/familia/integrantes/${id}` : `/api/familia/mascotas/${id}`);
      await refresh();
      navigation.goBack();
    } catch (err) {
      setError(err.mensaje);
      setDeleting(false);
    }
  }

  // Eliminar no está al nivel de Editar: va en «⋯» y pide confirmación.
  function masAcciones() {
    elegirOpcion(`Más acciones sobre ${corto}`, [{ text: `Eliminar a ${corto}`, value: 'eliminar' }], (v) => {
      if (v !== 'eliminar') return;
      confirmarDestructivo(
        `¿Eliminar a ${nombre}?`,
        'Se borran sus vacunas, tratamientos, historial, pesos, documentos y lo que tenía programado. No se puede recuperar.',
        handleEliminarConfirmado,
        `Eliminar a ${corto}`
      );
    });
  }

  // Nota humana (post-it): se guarda en `observaciones` sin tocar el resto de los datos.
  async function guardarNota(textoNota) {
    try {
      const fecha = member?.fecha_nacimiento ? String(member.fecha_nacimiento).slice(0, 10) : undefined;
      if (esMascota) {
        await api.patch(`/api/familia/mascotas/${id}`, {
          nombre: member.nombre,
          especie: member.especie,
          raza: member.raza || undefined,
          fecha_nacimiento: fecha,
          observaciones: textoNota || null,
        });
      } else {
        await api.patch(`/api/familia/integrantes/${id}`, {
          nombre: member.nombre,
          apellido: member.apellido,
          fecha_nacimiento: fecha,
          observaciones: textoNota || null,
        });
      }
      await refresh();
      mostrarToast(textoNota ? 'Nota pegada' : 'Nota despegada');
      return true;
    } catch (err) {
      mostrarToast(err?.status ? err.mensaje : 'No pudimos guardar la nota. Revisá la conexión y probá de nuevo.', 'error');
      return false;
    }
  }

  async function registrarPeso(valor) {
    try {
      await api.post('/api/salud/pesos', { ...ownerQueryParams(tipo, id), kg: valor });
      setPesos(await getList('/api/salud/pesos', { params: ownerQueryParams(tipo, id) }));
      mostrarToast(`Anotamos ${String(valor).replace('.', ',')} kg para ${corto}`);
      return true;
    } catch (err) {
      mostrarToast(err?.status ? err.mensaje : 'No pudimos anotar el peso. Probá de nuevo.', 'error');
      return false;
    }
  }

  // Fade + desplazamiento corto al cambiar de pestaña.
  const contentAnim = useRef(new Animated.Value(1)).current;
  const isFirstTabRef = useRef(true);
  useEffect(() => {
    if (isFirstTabRef.current) {
      isFirstTabRef.current = false;
      return;
    }
    contentAnim.setValue(0);
    Animated.timing(contentAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }, [activeTab, contentAnim]);
  const contentTranslateY = contentAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

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
      // Los pesos son aparte: si el backend todavía no los tiene, la ficha se ve igual.
      getList('/api/salud/pesos', { params }).then(setPesos).catch(() => setPesos([]));
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
    navigation.navigate(tipoRegistro === 'vacuna' ? 'AddVaccine' : 'AddTreatment', { ...ownerParams, editando: item });
  }
  const irAAgregarVacuna = () => navigation.navigate('AddVaccine', ownerParams);
  const irAAgregarTratamiento = () => navigation.navigate('AddTreatment', ownerParams);

  const linea = armarLineaDeTiempo({ historial, vacunas, pesos, tratamientos });

  // ---------------- ficha rápida (chips) ----------------
  const edad = edadDe(member?.fecha_nacimiento);
  const ultimoPeso = pesos[pesos.length - 1];
  const chips = [];
  if (esMascota) {
    chips.push(member?.raza ? `${member.especie} · ${member.raza}` : member?.especie);
  }
  if (edad !== null) chips.push(plural(edad, 'año'));
  if (ultimoPeso) chips.push(`${String(ultimoPeso.kg).replace('.', ',')} kg`);
  if (esMascota && member?.sexo) chips.push(member.sexo === 'hembra' ? 'Hembra' : 'Macho');
  if (esMascota && member?.castrado !== null && member?.castrado !== undefined) {
    const hembra = member?.sexo === 'hembra';
    chips.push(member.castrado ? (hembra ? 'Castrada' : 'Castrado') : hembra ? 'Sin castrar' : 'Sin castrar');
  }
  if (esMascota && member?.microchip) chips.push(`Chip ${member.microchip}`);
  if (!esMascota && member?.tipo_sangre) chips.push(`Sangre ${member.tipo_sangre}`);
  const faltanDatos = esMascota && (!member?.sexo || member?.castrado === null || member?.castrado === undefined || !member?.microchip);

  // ---------------- bloques ----------------
  const notaPostIt = (
    <PostIt
      texto={member?.observaciones}
      nombre={corto}
      tono={esMascota ? 'mostaza' : 'rosa'}
      giro={desktop ? 3 : -2}
      onGuardar={guardarNota}
    />
  );

  const header = (
    <View style={[styles.escena, !desktop && styles.escenaMobile]}>
      <EscenaFicha mascota={esMascota} />
      <PressScale contentStyle={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
        <Text style={styles.backText}>Volver</Text>
      </PressScale>
      <View style={[styles.identity, !desktop && styles.identityMobile]}>
        <MarcoPolaroid fotoUrl={member?.foto_url} mascota={esMascota} nombre={nombre} tam={desktop ? 128 : 104} />
        <View style={styles.identityText}>
          <Text style={[styles.name, !desktop && styles.nameMobile]} accessibilityRole="header">{nombre}</Text>
          <View style={styles.chips}>
            {chips.filter(Boolean).map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipTexto}>{c}</Text>
              </View>
            ))}
            {faltanDatos && (
              <PressScale contentStyle={[styles.chip, styles.chipCompletar]} onPress={handleEditar} accessibilityLabel={`Completar la ficha de ${corto}: sexo, castración y microchip`}>
                <Ionicons name="add" size={14} color={color.terracotaTexto} />
                <Text style={[styles.chipTexto, { color: color.terracotaTexto }]}>Completar ficha</Text>
              </PressScale>
            )}
          </View>
          <View style={styles.acciones}>
            <PressScale contentStyle={styles.headerAction} onPress={handleEditar} disabled={deleting} accessibilityLabel={`Editar los datos de ${corto}`}>
              <Ionicons name="pencil-outline" size={18} color={colors.ink} />
              <Text style={styles.headerActionText}>Editar</Text>
            </PressScale>
            <PressScale contentStyle={[styles.headerAction, styles.masBtn]} onPress={masAcciones} disabled={deleting} accessibilityLabel={`Más acciones sobre ${corto}`}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.ink} />
            </PressScale>
          </View>
        </View>
        {desktop && <View style={styles.postItEsquina}>{notaPostIt}</View>}
      </View>
    </View>
  );

  const frase = fraseVacunas(corto, vacunas);
  const tabs = (
    <PestanasFichero
      opciones={[
        { valor: 'vacunas', etiqueta: 'Vacunas', cantidad: vacunas.length, tono: 'mostaza' },
        { valor: 'tratamientos', etiqueta: 'Tratamientos', cantidad: tratamientos.length, tono: 'rosa' },
        { valor: 'historial', etiqueta: 'Historial', cantidad: linea.length, tono: 'salvia' },
      ]}
      activa={activeTab}
      onCambiar={setActiveTab}
    />
  );

  const fichero = (
    <View>
      {tabs}
      <PaperCard nivel={2} hoja={esMascota ? 'salvia' : 'terracota'} rotacion={-1} style={styles.ficheroCard} wrapperStyle={styles.hojaMargen}>
        {!!error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
        {loading ? (
          <View style={styles.list}>
            <SkeletonRecordRow />
            <SkeletonRecordRow />
          </View>
        ) : loadError ? (
          <InlineError message="No pudimos cargar la libreta." onRetry={fetchAll} />
        ) : (
          <Animated.View style={[styles.list, { opacity: contentAnim, transform: [{ translateY: contentTranslateY }] }]}>
            {activeTab === 'vacunas' &&
              (vacunas.length === 0 ? (
                <Vacio
                  ilustracion="vacuna"
                  titulo={`Todavía no hay vacunas de ${corto}`}
                  texto="Cargá las que ya se aplicó y te avisamos cuando toque la próxima."
                  accion="Agregar vacuna"
                  onAccion={irAAgregarVacuna}
                />
              ) : (
                <>
                  <View style={styles.tabHeader}>
                    <View style={styles.tabTituloCaja}>
                      <Text style={styles.tabTitulo}>Vacunas de {corto}</Text>
                      {!!frase && (
                        <Text style={[styles.frase, frase.tono === 'alerta' && styles.fraseAlerta, frase.tono === 'ok' && styles.fraseOk]}>{frase.texto}</Text>
                      )}
                    </View>
                    <PrimaryButton title="Agregar vacuna" variant="accent" fullWidth={!desktop} onPress={irAAgregarVacuna} />
                  </View>
                  {vacunas.map((item, i) => (
                    <FadeSlideIn key={`vacuna-${item.id}`} index={i}>
                      <FadeOutRow exiting={exitingKey === `vacuna-${item.id}`}>
                        <StickerVacuna vacuna={item} giro={i % 2 ? 0.6 : -0.5} onEditar={() => handleEditarRegistro('vacuna', item)}>
                          <AttachmentsSection parentType="vacuna" parentId={item.id} label="Certificado o foto de la libreta" compact addLabel="Adjuntar" />
                        </StickerVacuna>
                      </FadeOutRow>
                    </FadeSlideIn>
                  ))}
                </>
              ))}

            {activeTab === 'tratamientos' &&
              (tratamientos.length === 0 ? (
                <Vacio
                  ilustracion="receta"
                  titulo={`${corto} no tiene tratamientos cargados`}
                  texto="Si toma algo seguido, cargalo: aparece en su ficha y podés programar las dosis."
                  accion="Agregar tratamiento"
                  onAccion={irAAgregarTratamiento}
                />
              ) : (
                <>
                  <View style={styles.tabHeader}>
                    <Text style={[styles.tabTitulo, styles.tabTituloCaja]}>Tratamientos de {corto}</Text>
                    <PrimaryButton title="Agregar tratamiento" variant="accent" fullWidth={!desktop} onPress={irAAgregarTratamiento} />
                  </View>
                  {tratamientos.map((item, i) => (
                    <FadeSlideIn key={`tratamiento-${item.id}`} index={i}>
                      <TreatmentRow item={item} disabled={recordBusy} onEdit={() => handleEditarRegistro('tratamiento', item)} />
                    </FadeSlideIn>
                  ))}
                </>
              ))}

            {activeTab === 'historial' &&
              (linea.length === 0 ? (
                <Vacio
                  ilustracion="portapapeles"
                  titulo={`Acá va a quedar la historia de ${corto}`}
                  texto="Consultas, vacunas, tratamientos y pesos, en orden, a medida que los cargues."
                />
              ) : (
                <>
                  <Text style={styles.tabTitulo}>La historia de {corto}</Text>
                  <LineaDeTiempo items={linea} />
                </>
              ))}
          </Animated.View>
        )}
      </PaperCard>
    </View>
  );

  const emergencyCard = !esMascota ? (
    <PaperCard nivel={2} style={styles.card}>
      <Text style={styles.cardTitle}>Emergencia</Text>
      <EmergencySummary integrante={member} integranteId={id} onAbrirFicha={() => navigation.navigate('Emergency', { id, nombre })} />
    </PaperCard>
  ) : null;

  const pesoCard = (
    <PaperCard nivel={2} style={styles.card}>
      <Text style={styles.cardTitle}>Peso de {corto}</Text>
      <GraficoPeso pesos={pesos} nombre={corto} onRegistrar={registrarPeso} />
    </PaperCard>
  );

  const professionalsCard = (
    <PaperCard nivel={2} style={styles.card}>
      <ProfessionalContactsSection parentType={tipo} parentId={id} nombreDueno={corto} />
    </PaperCard>
  );

  const documentsCard = (
    <PaperCard nivel={2} style={styles.card}>
      <AttachmentsSection
        parentType={tipo}
        parentId={id}
        label="Documentos"
        hint={`Estudios, recetas o la foto de la libreta de ${corto}.`}
        addLabel="Adjuntar documento"
      />
    </PaperCard>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, desktop ? styles.scrollDesktop : styles.scrollMobile, { paddingTop: (desktop ? 24 : 12) + insets.top }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />}
      >
        <View style={styles.container}>
          {header}
          {!desktop && <View style={styles.postItMobile}>{notaPostIt}</View>}

          {desktop ? (
            <View style={styles.columns}>
              <View style={styles.colLeft}>{fichero}</View>
              <View style={styles.colRight}>
                {emergencyCard}
                {professionalsCard}
                {pesoCard}
                {documentsCard}
              </View>
            </View>
          ) : (
            <View style={styles.stack}>
              {emergencyCard}
              {fichero}
              {professionalsCard}
              {pesoCard}
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
  flex1: { flex: 1, minWidth: 0 },
  scroll: { paddingBottom: 112 },
  scrollDesktop: { paddingHorizontal: 48 },
  scrollMobile: { paddingHorizontal: 20 },
  container: { width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center', gap: 20 },

  // ---- cabecera (escena de papel) ----
  escena: { position: 'relative', minHeight: 250, borderRadius: radio.contenedor, padding: espacio[6], paddingBottom: espacio[10] },
  escenaMobile: { padding: espacio[4], paddingBottom: espacio[8] },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, minHeight: tactil.minimo, paddingRight: 16 },
  backText: { fontSize: 16, fontFamily: poppinsWeight('500'), color: colors.ink },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio[6], marginTop: espacio[2] },
  identityMobile: { flexDirection: 'column', gap: espacio[4] },
  identityText: { flex: 1, minWidth: 0, gap: espacio[3] },
  name: { fontSize: 40, lineHeight: 48, fontFamily: SERIF_BOLD, color: colors.ink },
  nameMobile: { fontSize: 32, lineHeight: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[2] },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: espacio[3], minHeight: 32, borderRadius: radio.pastilla, backgroundColor: 'rgba(255, 253, 249, 0.92)', borderWidth: 1, borderColor: 'rgba(42, 36, 33, 0.12)' },
  chipCompletar: { borderStyle: 'dashed', borderColor: 'rgba(170, 69, 29, 0.5)', minHeight: tactil.minimo },
  chipTexto: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.ink, fontVariant: ['tabular-nums'] },
  acciones: { flexDirection: 'row', gap: espacio[2] },
  headerAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: tactil.minimo, paddingHorizontal: espacio[4], borderRadius: radio.control, backgroundColor: color.cartulina, borderWidth: 1, borderColor: color.lineaFuerte },
  masBtn: { width: tactil.minimo, paddingHorizontal: 0 },
  headerActionText: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.ink },
  postItEsquina: { marginTop: -espacio[2], marginRight: espacio[2] },
  postItMobile: { alignItems: 'flex-end', marginTop: -espacio[8], marginRight: espacio[2] },

  // ---- layout ----
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  colLeft: { flex: 65, minWidth: 0 },
  colRight: { flex: 35, minWidth: 300, gap: 20 },
  stack: { gap: 20 },

  // ---- tarjetas ----
  card: { padding: espacio[5], gap: espacio[3] },
  cardTitle: { fontSize: 20, lineHeight: 28, fontFamily: SERIF_BOLD, color: colors.ink },
  ficheroCard: { padding: espacio[5], borderTopLeftRadius: 0 },
  hojaMargen: { marginRight: 7, marginBottom: 8 },
  tabHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  tabTituloCaja: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0 },
  tabTitulo: { fontSize: 22, lineHeight: 30, fontFamily: SERIF_BOLD, color: colors.ink },
  frase: { fontSize: 15, lineHeight: 22, color: colors.textBody, marginTop: 2 },
  fraseAlerta: { color: '#A6291B', fontFamily: poppinsWeight('600') },
  fraseOk: { color: '#3D5A4B', fontFamily: poppinsWeight('600') },
  list: { gap: 14 },

  // ---- registros ----
  recordCard: { backgroundColor: color.cartulina, borderWidth: 1, borderColor: 'rgba(42, 36, 33, 0.1)', borderRadius: 14, padding: 16, gap: 6 },
  recordHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordIcono: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8E1DB' },
  recordTitle: { fontSize: 17, lineHeight: 24, fontFamily: poppinsWeight('700'), color: colors.ink },
  recordTitleFlex: { flex: 1 },
  recordEditBtn: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  recordMeta: { fontVariant: ['tabular-nums'], fontSize: 15, lineHeight: 22, color: colors.textBody },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E3ECE6' },
  statusBadgeInactive: { backgroundColor: '#EFE9E2' },
  statusBadgeText: { fontSize: 13, fontFamily: poppinsWeight('600'), color: '#3B5A4C' },
  statusBadgeTextInactive: { color: '#6B6357' },

  // ---- estado vacío ----
  empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyTitulo: { fontSize: 20, lineHeight: 28, fontFamily: SERIF_BOLD, color: colors.ink, textAlign: 'center' },
  emptyText: { fontSize: 16, lineHeight: 24, color: colors.textBody, textAlign: 'center', maxWidth: 420 },
  emptyAction: { marginTop: 8 },
});
