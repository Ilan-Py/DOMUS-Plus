import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import ErrorBanner from '../components/ErrorBanner';
import { textoGuardadoEn } from '../utils/cacheLocal';
import { plural } from '../utils/formato';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import BannerRecortes from '../components/BannerRecortes';
import { HoyPanel, SemanaTira, AlertasFamilia, calcularAlertas } from '../components/FamiliaHoy';
import useAvisos, { useVacunas } from '../hooks/useAvisos';
import { duenoDeAviso, inicioDeDia, cuando } from '../utils/avisos';
import { paper } from '../theme/paper';
import PaperCard from '../components/PaperCard';
import SlotVacio from '../components/SlotVacio';
import PressScale from '../components/PressScale';
import Skeleton from '../components/Skeleton';
import FadeSlideIn from '../components/FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from '../components/FadeOutRow';
import { confirmarDestructivo } from '../utils/confirm';
import EntityAvatar from '../components/EntityAvatar';

// Layout (ver DESIGN.md): desde 1024px, banner a todo el ancho y debajo dos
// columnas (64% integrantes y mascotas / 36% «Hoy en tu familia») en un
// contenedor de hasta 1120px; debajo, una sola columna apilada.
const DESKTOP_BREAKPOINT = 1024;
const CONTAINER_MAX_WIDTH = 1440;
// 3 columnas desde 1280 px, 2 en tablet (desde 768 px) y 1 en móvil.
const TRES_COLUMNAS = 1280;
const DOS_COLUMNAS = 768;

const TIPO_LABELS = { adulto: 'Adulto', menor: 'Menor', mayor: 'Mayor' };

// El backend guarda fecha_nacimiento, no una edad — se calcula acá para el
// subtítulo ("Adulto · 41 años") que antes venía escrito a mano en el mock.
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad -= 1;
  return edad;
}

// Tarjeta de integrante o mascota: avatar circular con la paleta cálida de su categoría,
// nombre y datos. En web, al pasar el mouse sube 2px y el borde se vuelve terracota
// claro. Los integrantes llevan un botón rápido de «Emergencia».
function MemberCard({ icon, nombre, apellido, nombreCompleto, fotoUrl, avatarId, subt, chips, progreso, proximo, detalle, detalleTono, color, tipo, mascota, onPress, onLongPress, onEmergencyPress, accionLabel, disabled }) {
  // La tarjeta no es un botón entero: abrir el perfil (toda la parte de datos) y la acción rápida son dos
  // controles hermanos, nunca uno dentro del otro.
  return (
    <PaperCard nivel={1} style={styles.cardWrap}>
      <View style={styles.memberCard}>
        {/* Barra lateral de 4 px: terracota para personas, verde salvia para mascotas */}
        <View pointerEvents="none" style={[styles.barra, { backgroundColor: color || (mascota ? colors.salvia : colors.accentStrong) }]} />
        <PressScale onPress={onPress} onLongPress={onLongPress} disabled={disabled} accessibilityLabel={`${nombreCompleto || nombre}, ${subt}`}>
          <View style={styles.memberHead}>
            <EntityAvatar avatarId={avatarId} type={mascota ? 'pet' : 'person'} name={nombre} apellido={apellido} size={48} tipo={tipo} fotoUrl={fotoUrl} />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{nombreCompleto || nombre}</Text>
              <Text style={styles.memberSubt}>{subt}</Text>
            </View>
          </View>
          {!!chips && chips.length > 0 && (
            <View style={styles.chips}>
              {chips.map((c) => (
                <View key={c.texto} style={[styles.chip, c.tono === 'sangre' ? styles.chipSangre : c.tono === 'alergia' ? styles.chipAlergia : styles.chipSalvia]}>
                  <Text style={[styles.chipTexto, c.tono === 'sangre' ? { color: '#9A3416' } : c.tono === 'alergia' ? { color: '#7A5112' } : { color: '#3B5A4C' }]} numberOfLines={1}>
                    {c.texto}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {!!detalle && (
            <View style={styles.detalleFila}>
              <View style={[styles.detallePunto, detalleTono === 'alerta' ? styles.puntoAlerta : styles.puntoOk]} />
              <Text style={[styles.detalleTexto, detalleTono === 'alerta' && styles.detalleAlerta]}>{detalle}</Text>
            </View>
          )}
          {!!proximo && (
            <View style={styles.detalleFila}>
              <Ionicons name="time-outline" size={16} color={colors.textBody} />
              <Text style={styles.detalleTexto} numberOfLines={1}>{proximo}</Text>
            </View>
          )}
          {progreso !== null && progreso !== undefined && progreso < 100 && (
            <View style={styles.progresoBloque}>
              <Text style={styles.detalleTexto}>Ficha al {progreso}%</Text>
              <View style={styles.progresoPista} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progreso }}>
                <View style={[styles.progresoRelleno, { width: `${progreso}%` }]} />
              </View>
            </View>
          )}
        </PressScale>
        {!!onEmergencyPress && (
          <PressScale
            contentStyle={styles.emergencyBadge}
            onPress={onEmergencyPress}
            disabled={disabled}
            accessibilityLabel={`${accionLabel || 'Ficha de emergencia'} de ${nombreCompleto || nombre}`}
          >
            <Ionicons name={mascota ? 'document-text-outline' : 'medkit-outline'} size={20} color={colors.limeDeep} />
            <Text style={styles.emergencyLabel}>{accionLabel || 'Emergencia'}</Text>
          </PressScale>
        )}
      </View>
    </PaperCard>
  );
}

// Silueta de MemberCard mientras cargan los datos.
function SkeletonMemberCard() {
  return (
    <View style={styles.cardWrap}>
      <View style={styles.memberCard}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.memberInfo}>
          <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={11} />
        </View>
      </View>
    </View>
  );
}

export default function FamilyListScreen({ navigation }) {
  const { grupo } = useAuth();
  const { integrantes, mascotas, loading, error, refresh, desdeCache } = useFamily();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= DESKTOP_BREAKPOINT;
  const columnas = width >= TRES_COLUMNAS ? 3 : width >= DOS_COLUMNAS ? 2 : 1;
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // Clave `${tipo}-${id}` de la fila que se está borrando — dispara su
  // fade-out (FadeOutRow) antes de que refresh() la saque del array.
  const [exitingKey, setExitingKey] = useState(null);
  const [menuAgregar, setMenuAgregar] = useState(false);
  const { avisos, todos, error: errorAvisos, actualizar, recargar } = useAvisos();
  const vacunas = useVacunas(integrantes, mascotas);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function openProfile({ id, tipo, nombre, member }) {
    navigation.navigate('ProfileDetail', { id, tipo, nombre, member });
  }

  function handleEditar(tipo, item) {
    navigation.navigate('AddMember', { tipoMiembro: tipo, memberToEdit: item });
  }

  async function handleEliminar(tipo, item) {
    setBusy(true);
    setActionError('');
    try {
      const url = tipo === 'integrante' ? `/api/familia/integrantes/${item.id}` : `/api/familia/mascotas/${item.id}`;
      await api.delete(url);
      // Fade-out de la fila (FadeOutRow) antes del refetch real — así el
      // array pierde el ítem recién cuando ya está invisible, sin que la
      // fila "salte" a desaparecer de golpe.
      setExitingKey(`${tipo}-${item.id}`);
      await new Promise((resolve) => setTimeout(resolve, EXIT_DURATION));
      await refresh();
    } catch (err) {
      setActionError(err.mensaje);
    } finally {
      setBusy(false);
      setExitingKey(null);
    }
  }

  function confirmEliminar(tipo, item, nombreCompleto) {
    confirmarDestructivo(
      `¿Eliminar a ${nombreCompleto}?`,
      'Se borran sus vacunas, tratamientos, historial, documentos y lo que tenía programado. No se puede recuperar.',
      () => handleEliminar(tipo, item),
      `Eliminar a ${String(nombreCompleto).split(' ')[0]}`
    );
  }

  // Long-press en la card — abre el menú de 3 opciones vía Alert.alert
  // nativo (funciona bien ahí, sin cambios). Alert.alert es un no-op en web
  // (ver utils/confirm.js) y no hay equivalente de 3 botones en las APIs de
  // browser — misma razón ya aplicada en ProfileDetailScreen.js — así que en
  // web el long-press degrada directo a "confirmar eliminar" en vez de no
  // hacer nada en silencio. Editar sigue alcanzable en web tocando la card
  // (abre ProfileDetailScreen, que ya tiene su propio botón de editar).
  function handleLongPress(tipo, item, nombreCompleto) {
    if (busy) return;
    if (Platform.OS === 'web') {
      confirmEliminar(tipo, item, nombreCompleto);
      return;
    }
    Alert.alert(
      nombreCompleto,
      undefined,
      [
        { text: 'Editar', onPress: () => handleEditar(tipo, item) },
        { text: 'Eliminar', style: 'destructive', onPress: () => confirmEliminar(tipo, item, nombreCompleto) },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }

  function irAAgregar(tipoMiembro) {
    setMenuAgregar(false);
    navigation.navigate('AddMember', { tipoMiembro });
  }

  function irARecordatorio(tipo) {
    navigation.navigate('Calendario', { screen: 'AddReminder', params: { tipo } });
  }

  const hoyFin = new Date();
  hoyFin.setHours(23, 59, 59, 999);
  const alertas = calcularAlertas({ avisos, vacunas });
  const hoyInicio = inicioDeDia(new Date());
  const esDeHoy = (a) => a.fecha >= hoyInicio && a.fecha <= hoyFin;

  // Estado de salud de cada mascota con los datos que ya existen: vacunas vencidas o al día.
  function detalleDeMascota(m) {
    const propias = vacunas.filter((v) => v.duenoClase === 'mascota' && v.duenoId === m.id && v.proxima);
    if (propias.some((v) => v.proxima < hoyInicio)) return { texto: 'Vacuna vencida', tono: 'alerta' };
    if (propias.length) return { texto: 'Vacunas al día', tono: 'ok' };
    return null;
  }
  // DOS-06: «hoy» cuenta sólo lo de hoy; lo de días anteriores sin marcar se dice aparte.
  function detalleDeIntegrante(i) {
    const suyos = (avisos || []).filter((a) => duenoDeAviso(a)?.clase === 'integrante' && duenoDeAviso(a).id === i.id);
    const atrasados = suyos.filter((a) => a.fecha < hoyInicio).length;
    if (atrasados > 0) return { texto: `${plural(atrasados, 'aviso')} sin marcar`, tono: 'alerta' };
    const hoy = suyos.filter(esDeHoy);
    const dosis = hoy.filter((a) => a.tipo === 'medicacion').length;
    if (dosis > 0) return { texto: `${plural(dosis, 'dosis', 'dosis')} hoy`, tono: 'alerta' };
    return hoy.length > 0 ? { texto: `${plural(hoy.length, 'aviso')} hoy`, tono: 'alerta' } : null;
  }

  // Datos para las tarjetas y las estadísticas, sólo con lo que ya existe en el backend.
  const en7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const dosisHoy = (avisos || []).filter((a) => a.tipo === 'medicacion' && esDeHoy(a)).length;
  const turnosSemana = (avisos || []).filter((a) => a.tipo === 'control' && a.fecha >= hoyInicio && a.fecha <= en7).length;
  const progresoFicha = (i) => Math.round((100 * [i.tipo_sangre, i.alergias, i.notas_emergencia].filter(Boolean).length) / 3);
  const fichasIncompletas = integrantes.filter((i) => progresoFicha(i) < 100).length;
  function chipsDe(i) {
    const c = [];
    if (i.tipo_sangre) c.push({ texto: i.tipo_sangre, tono: 'sangre' });
    if (i.alergias) c.push({ texto: `Alergias: ${i.alergias}`, tono: 'alergia' });
    return c;
  }
  function proximoDe(clase, id) {
    const a = (avisos || []).find((x) => duenoDeAviso(x)?.clase === clase && duenoDeAviso(x).id === id);
    return a ? `${a.descripcion || 'Recordatorio'} · ${cuando(a.fecha)}` : null;
  }

  const resumen = `${integrantes.length} integrante${integrantes.length === 1 ? '' : 's'} · ${mascotas.length} mascota${mascotas.length === 1 ? '' : 's'}`;

  // ---------------- bloques ----------------
  // Encabezado compacto: nombre del grupo, tres datos clave y un único botón principal con menú.
  const banner = (
    <View style={styles.banner}>
      <View pointerEvents="none" style={[styles.bannerCapa, styles.bannerSombra]} {...paper('recorte')} />
      <View pointerEvents="none" style={styles.bannerCapa} {...paper('recorte')} />
      <View style={[styles.bannerDoodle, !desktop && styles.bannerDoodleMobile]} pointerEvents="none">
        <BannerRecortes width={desktop ? 190 : 130} />
      </View>
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle} numberOfLines={2} accessibilityRole="header">
          {grupo?.nombre}
        </Text>
        <Text style={styles.bannerSummary}>{resumen}</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, dosisHoy > 0 && styles.statAlerta]}>{avisos === null ? '…' : `${dosisHoy} dosis hoy`}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{avisos === null ? '…' : `${turnosSemana} turno${turnosSemana === 1 ? '' : 's'} esta semana`}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, fichasIncompletas > 0 && styles.statAlerta]}>{`${fichasIncompletas} ficha${fichasIncompletas === 1 ? '' : 's'} incompleta${fichasIncompletas === 1 ? '' : 's'}`}</Text>
          </View>
        </View>
        <View style={styles.bannerAction}>
          <PrimaryButton title="+ Agregar" variant="accent" fullWidth={false} onPress={() => setMenuAgregar((v) => !v)} />
          {menuAgregar && (
            <View style={styles.menuAgregar} accessibilityRole="menu">
              {[
                { t: 'Integrante con cuenta', s: 'Invitalo con un código', icon: 'mail-outline', col: colors.accentStrong, ir: () => navigation.navigate('Cuenta') },
                { t: 'Perfil sin cuenta', s: 'Niño o adulto mayor', icon: 'person-add-outline', col: colors.accentStrong, ir: () => irAAgregar('integrante') },
                { t: 'Mascota', icon: 'paw-outline', col: colors.salvia, ir: () => irAAgregar('mascota') },
                { sep: true },
                { t: 'Medicación', icon: 'medkit-outline', col: colors.accentStrong, ir: () => irARecordatorio('medicacion') },
                { t: 'Turno', icon: 'calendar-outline', col: colors.ocre, ir: () => irARecordatorio('control') },
                { t: 'Vacuna', icon: 'shield-checkmark-outline', col: colors.salvia, ir: () => irARecordatorio('vacuna') },
              ].map((it, i) =>
                it.sep ? (
                  <View key={i} style={styles.menuSep} />
                ) : (
                  <PressScale
                    key={it.t}
                    contentStyle={styles.menuFila}
                    onPress={() => {
                      setMenuAgregar(false);
                      it.ir();
                    }}
                    accessibilityRole="menuitem"
                    accessibilityLabel={it.s ? `${it.t}: ${it.s}` : it.t}
                  >
                    <Ionicons name={it.icon} size={20} color={it.col} />
                    <View>
                      <Text style={styles.menuTexto}>{it.t}</Text>
                      {!!it.s && <Text style={styles.menuSub}>{it.s}</Text>}
                    </View>
                  </PressScale>
                )
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const alertasBloque = <AlertasFamilia alertas={alertas} />;
  const hoyCard = (
    <HoyPanel
      avisos={avisos}
      todos={todos}
      error={errorAvisos}
      actualizar={actualizar}
      recargar={recargar}
      integrantes={integrantes}
      mascotas={mascotas}
      onVerCalendario={() => navigation.navigate('Calendario')}
      onProgramar={() => navigation.navigate('Calendario', { screen: 'AddReminder' })}
    />
  );
  const semanaCard = (
    <SemanaTira avisos={avisos} onElegirDia={(dia) => navigation.navigate('Calendario', { screen: 'Calendar', params: { dia } })} />
  );

  const listaDeIntegrantes = (
    <View style={[styles.bandeja, styles.bandejaPersonas]}>
      <View style={styles.sectionHead}>
        <Ionicons name="people" size={20} color={colors.accentStrong} />
        <Text style={styles.sectionLabel} accessibilityRole="header">
          Integrantes ({integrantes.length})
        </Text>
      </View>
      {integrantes.length === 0 ? (
        <SlotVacio texto="Agregar persona" icono="person-add-outline" onPress={() => irAAgregar('integrante')} />
      ) : (
        <View style={styles.grid}>
          {integrantes.map((item, i) => {
            const edad = calcularEdad(item.fecha_nacimiento);
            const nombreCompleto = `${item.nombre} ${item.apellido}`;
            const key = `integrante-${item.id}`;
            return (
              <FadeSlideIn key={key} index={i} style={styles.gridItem}>
                <FadeOutRow exiting={exitingKey === key}>
                  <MemberCard
                    icon="person"
                    nombre={item.nombre}
                    apellido={item.apellido}
                    fotoUrl={item.foto_url}
                    avatarId={item.avatar_id}
                    nombreCompleto={nombreCompleto}
                    subt={`${TIPO_LABELS[item.tipo] ?? item.tipo}${edad !== null ? ` · ${edad} años` : ''}`}
                    tipo={item.tipo}
                    chips={chipsDe(item)}
                    progreso={progresoFicha(item)}
                    proximo={proximoDe('integrante', item.id)}
                    detalle={detalleDeIntegrante(item)?.texto}
                    detalleTono={detalleDeIntegrante(item)?.tono}
                    disabled={busy}
                    onPress={() =>
                      openProfile({ id: item.id, tipo: 'integrante', nombre: nombreCompleto, member: item })
                    }
                    onLongPress={() => handleLongPress('integrante', item, nombreCompleto)}
                    onEmergencyPress={() => navigation.navigate('Emergency', { id: item.id, nombre: nombreCompleto })}
                  />
                </FadeOutRow>
              </FadeSlideIn>
            );
          })}
          <View style={styles.gridItem}><SlotVacio texto="Agregar persona" icono="person-add-outline" onPress={() => irAAgregar('integrante')} /></View>
        </View>
      )}
    </View>
  );

  const listaDeMascotas = (
    <View style={[styles.bandeja, styles.bandejaMascotas]}>
      <View style={styles.sectionHead}>
        <Ionicons name="paw" size={20} color={colors.salvia} />
        <Text style={styles.sectionLabel} accessibilityRole="header">
          Mascotas ({mascotas.length})
        </Text>
      </View>
      {mascotas.length === 0 ? (
        <SlotVacio texto="Agregar mascota" icono="paw-outline" onPress={() => irAAgregar('mascota')} />
      ) : (
        <View style={styles.grid}>
          {mascotas.map((item, i) => {
            const key = `mascota-${item.id}`;
            return (
              <FadeSlideIn key={key} index={i} style={styles.gridItem}>
                <FadeOutRow exiting={exitingKey === key}>
                  <MemberCard
                    icon="paw"
                    mascota
                    fotoUrl={item.foto_url}
                    avatarId={item.avatar_id}
                    nombre={item.nombre}
                    subt={item.raza ? `${item.especie} · ${item.raza}` : item.especie}
                    proximo={proximoDe('mascota', item.id)}
                    detalle={detalleDeMascota(item)?.texto}
                    detalleTono={detalleDeMascota(item)?.tono}
                    accionLabel="Ficha"
                    onEmergencyPress={() => openProfile({ id: item.id, tipo: 'mascota', nombre: item.nombre, member: item })}
                    disabled={busy}
                    onPress={() => openProfile({ id: item.id, tipo: 'mascota', nombre: item.nombre, member: item })}
                    onLongPress={() => handleLongPress('mascota', item, item.nombre)}
                  />
                </FadeOutRow>
              </FadeSlideIn>
            );
          })}
          <View style={styles.gridItem}><SlotVacio texto="Agregar mascota" icono="paw-outline" onPress={() => irAAgregar('mascota')} /></View>
        </View>
      )}
    </View>
  );

  // Primer ingreso: ni integrantes ni mascotas todavía — un solo bloque cálido con la acción directa
  // en vez de dos listas vacías.
  const vacio = !loading && !error && integrantes.length === 0 && mascotas.length === 0;
  const primerIngreso = (
    <EmptyState
      titulo="¡Armemos tu familia!"
      message="Sumá a tu primer familiar o mascota para empezar a guardar vacunas, tratamientos y recordatorios."
      recortes={[
        { icon: 'people', tinte: 'terracota' },
        { icon: 'heart', tinte: 'arena' },
        { icon: 'paw', tinte: 'salvia' },
      ]}
      acciones={[
        { label: 'Agregar un familiar', onPress: () => navigation.navigate('AddMember', { tipoMiembro: 'integrante' }) },
        { label: 'Agregar una mascota', onPress: () => navigation.navigate('AddMember', { tipoMiembro: 'mascota' }) },
      ]}
    />
  );
  const cargando = (
    <View style={styles.bandeja}>
      <View style={styles.grid}>
        <View style={styles.gridItem}><SkeletonMemberCard /></View>
        <View style={styles.gridItem}><SkeletonMemberCard /></View>
      </View>
    </View>
  );

  // Primer ingreso o carga: una sola bandeja ancha; si no, una bandeja por categoría.
  const izquierda =
    loading || vacio ? (
      <View style={styles.colDoble}>
        {loading ? cargando : <View style={styles.bandeja}>{primerIngreso}</View>}
      </View>
    ) : (
      <>
        <View style={styles.col}>{listaDeIntegrantes}</View>
        <View style={styles.col}>{listaDeMascotas}</View>
      </>
    );

  const errores = (
    <>
      {!!desdeCache && (
        <ErrorBanner
          variant="aviso"
          message={`Sin conexión. Estás viendo los datos guardados ${textoGuardadoEn(desdeCache)}. Las fichas de emergencia se pueden abrir igual.`}
          onRetry={refresh}
        />
      )}
      {(!!error || !!actionError) && (
        <ErrorBanner
          message={error || actionError}
          onDismiss={error ? undefined : () => setActionError('')}
          onRetry={error ? refresh : undefined}
        />
      )}
    </>
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
          {banner}
          {errores}
          {alertasBloque}

          {columnas >= 2 ? (
            <View style={styles.stack}>
              {/* Hoy, lo accionable, es lo más ancho; las personas y mascotas quedan a la derecha. */}
              <View style={styles.columns}>
                <View style={styles.colHoy}>
                  {hoyCard}
                  {semanaCard}
                </View>
                <View style={styles.colMiembros}>
                  {loading ? cargando : vacio ? <View style={styles.bandeja}>{primerIngreso}</View> : (
                    <>
                      {listaDeIntegrantes}
                      {listaDeMascotas}
                    </>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.stack}>
              {hoyCard}
              {loading ? cargando : vacio ? <View style={styles.bandeja}>{primerIngreso}</View> : (
                <>
                  {listaDeIntegrantes}
                  {listaDeMascotas}
                </>
              )}
              {semanaCard}
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
  container: { width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center', gap: 24 },
  // Escritorio: alineado a la izquierda, pegado a la barra lateral (sin pasillo vacío).
  containerIzq: { alignSelf: 'flex-start' },

  // ---- banner cálido
  banner: {
    position: 'relative',
    marginBottom: 6,
    zIndex: 10, // el menú "+ Agregar" tiene que pasar por encima de las tarjetas de abajo
    paddingVertical: 24,
    paddingHorizontal: 28,
    minHeight: 168,
    justifyContent: 'center',
  },
  // Recorta los dibujos en la esquina (el banner ya no recorta para que el menú pueda salirse).
  bannerDoodle: { position: 'absolute', right: 0, bottom: 0, paddingRight: 16, overflow: 'hidden', borderBottomRightRadius: 15, opacity: 1 },
  bannerDoodleMobile: { top: 0, bottom: undefined, opacity: 0.75 },
  bannerText: { zIndex: 1, gap: 4, maxWidth: '62%' },
  bannerTitle: { fontSize: 32, lineHeight: 40, fontFamily: SERIF_BOLD, color: colors.ink },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  stat: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.7)' },
  statNum: { fontSize: 14, lineHeight: 20, fontFamily: poppinsWeight('600'), color: colors.ink },
  statAlerta: { color: '#9A3416' },
  bannerAction: { marginTop: 16, alignSelf: 'flex-start', zIndex: 20 },
  menuAgregar: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 8,
    minWidth: 260,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(42, 36, 33, 0.1)',
    backgroundColor: '#FFFFFF',
    zIndex: 30,
    elevation: 6,
  },
  menuFila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 12, borderRadius: 8 },
  menuTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.ink },
  colHoy: { flex: 1.2, minWidth: 0, gap: 24 },
  colMiembros: { flex: 1, minWidth: 0, gap: 24 },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(42, 36, 33, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  slotTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.textBody },
  detalleFila: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  detallePunto: { width: 8, height: 8, borderRadius: 4 },
  puntoOk: { backgroundColor: colors.salvia },
  puntoAlerta: { backgroundColor: '#C24623' },
  detalleTexto: { fontSize: 14, lineHeight: 20, color: colors.textBody },
  detalleAlerta: { color: '#9A3416', fontFamily: poppinsWeight('600') },

  // ---- layout
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  col: { flex: 1, gap: 24, minWidth: 0 },
  colDoble: { flex: 2, minWidth: 0, gap: 24 },
  stack: { gap: 24 },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Regla de títulos: los de página y de tarjeta van en la serif de la marca.
  sectionLabel: { fontSize: 20, lineHeight: 28, fontFamily: SERIF_BOLD, color: colors.ink },
  grid: { gap: 12 },
  gridItem: { width: '100%' },

  // Bandeja de papel: base suave sobre la que se apoyan las tarjetas blancas de cartulina.
  bandeja: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(42, 36, 33, 0.08)',
    backgroundColor: '#F5EFE6',
  },
  // Un solo acento por tarjeta (la barra lateral): las bandejas ya no llevan borde superior de color.
  bandejaPersonas: {},
  bandejaMascotas: {},

  // ---- tarjetas de integrantes y mascotas
  // Sombra de cartulina: en web, de dos capas vía theme/paper.js; en nativo, una corta y nítida.
  cardWrap: { width: '100%' },
  barra: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 4 },
  cardWrapWeb: { transitionProperty: 'transform', transitionDuration: '150ms', transitionTimingFunction: 'ease-out' },
  cardWrapHover: { transform: [{ translateY: -2 }] },
  memberCard: {
    gap: 12,
    minHeight: 80,
    padding: 16,
    paddingLeft: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, maxWidth: '100%' },
  chipSangre: { backgroundColor: '#FAECE7' },
  chipAlergia: { backgroundColor: '#FDF3E1' },
  chipSalvia: { backgroundColor: '#E8F0EC' },
  chipTexto: { fontSize: 13, lineHeight: 18, fontFamily: poppinsWeight('600') },
  progresoBloque: { marginTop: 10, gap: 4 },
  progresoPista: { height: 8, borderRadius: 4, backgroundColor: colors.arena, overflow: 'hidden' },
  progresoRelleno: { height: 8, borderRadius: 4, backgroundColor: colors.ocre },
  menuSub: { fontSize: 13, lineHeight: 18, color: colors.textBody },
  menuSep: { height: 1, marginVertical: 4, marginHorizontal: 8, backgroundColor: 'rgba(42, 36, 33, 0.1)' },
  bannerSummary: { fontSize: 15, lineHeight: 22, color: colors.textBody },
  bannerCapa: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.arena, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  bannerSombra: { top: 4, left: 4, right: -4, bottom: -4, backgroundColor: '#E4D6C6' },
  memberHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 17, lineHeight: 24, fontFamily: poppinsWeight('700'), color: colors.ink },
  memberSubt: { fontSize: 15, lineHeight: 22, color: colors.textBody },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.bgBase,
  },
  emergencyLabel: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.limeDeep },
});
