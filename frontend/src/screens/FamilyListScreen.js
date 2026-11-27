import React, { useState } from 'react';
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
import { poppinsWeight } from '../theme/typography';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import TodayCard from '../components/TodayCard';
import { BannerDoodle, AmbientHalo } from '../components/FamilyDoodles';
import PressScale from '../components/PressScale';
import Skeleton from '../components/Skeleton';
import FadeSlideIn from '../components/FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from '../components/FadeOutRow';
import { confirmarDestructivo, elegirTarjetas } from '../utils/confirm';
import Avatar from '../components/Avatar';
import { avatarTint } from '../theme/avatars';

// Layout (ver DESIGN.md): desde 1024px, banner a todo el ancho y debajo dos
// columnas (64% integrantes y mascotas / 36% «Hoy en tu familia») en un
// contenedor de hasta 1120px; debajo, una sola columna apilada.
const DESKTOP_BREAKPOINT = 1024;
const CONTAINER_MAX_WIDTH = 1120;

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
function MemberCard({ icon, nombre, apellido, nombreCompleto, fotoUrl, subt, tipo, mascota, onPress, onLongPress, onEmergencyPress, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <View style={[styles.cardWrap, Platform.OS === 'web' && styles.cardWrapWeb, hover && styles.cardWrapHover]}>
      <PressScale
        contentStyle={[styles.memberCard, hover && styles.memberCardHover]}
        onPress={onPress}
        onLongPress={onLongPress}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        disabled={disabled}
        accessibilityLabel={`${nombreCompleto || nombre}, ${subt}`}
      >
        <View style={styles.memberHead}>
          <Avatar nombre={nombre} apellido={apellido} size={48} mascota={mascota} tipo={tipo} fotoUrl={fotoUrl} />
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{nombreCompleto || nombre}</Text>
            <Text style={styles.memberSubt}>{subt}</Text>
          </View>
        </View>
        {!!onEmergencyPress && (
          <PressScale
            contentStyle={styles.emergencyBadge}
            onPress={onEmergencyPress}
            disabled={disabled}
            accessibilityLabel={`Ficha de emergencia de ${nombreCompleto || nombre}`}
          >
            <Ionicons name="medkit-outline" size={20} color={colors.limeDeep} />
            <Text style={styles.emergencyLabel}>Emergencia</Text>
          </PressScale>
        )}
      </PressScale>
    </View>
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
  const { integrantes, mascotas, loading, error, refresh } = useFamily();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= DESKTOP_BREAKPOINT;
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // Clave `${tipo}-${id}` de la fila que se está borrando — dispara su
  // fade-out (FadeOutRow) antes de que refresh() la saque del array.
  const [exitingKey, setExitingKey] = useState(null);

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
      'Eliminar',
      `¿Seguro que querés eliminar a ${nombreCompleto}? Se perderá su historial de salud asociado.`,
      () => handleEliminar(tipo, item)
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

  // Alta de persona o mascota (reemplaza al botón flotante con menú radial).
  function agregar() {
    // Mismos colores que los avatares de la lista: arena (personas) y salvia (mascotas).
    const persona = avatarTint('adulto');
    elegirTarjetas(
      '¿Qué querés agregar?',
      [
        { label: 'Persona', hint: 'Hijos, padres o abuelos, con o sin cuenta', icon: 'person', bg: persona.bg, fg: persona.text, value: 'integrante' },
        { label: 'Mascota', hint: 'Perro, gato u otro animal', icon: 'paw', bg: colors.sage, fg: colors.sageDeep, value: 'mascota' },
      ],
      (tipoMiembro) => navigation.navigate('AddMember', { tipoMiembro })
    );
  }

  const resumen = `${integrantes.length} integrante${integrantes.length === 1 ? '' : 's'} · ${mascotas.length} mascota${mascotas.length === 1 ? '' : 's'}`;

  // ---------------- bloques ----------------
  const banner = (
    <View style={styles.banner}>
      <View style={[styles.bannerDoodle, !desktop && styles.bannerDoodleMobile]} pointerEvents="none">
        <BannerDoodle width={desktop ? 300 : 170} />
      </View>
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle} numberOfLines={2} accessibilityRole="header">
          {grupo?.nombre}
        </Text>
        <Text style={styles.bannerSummary}>{resumen}</Text>
        <View style={styles.bannerAction}>
          <PrimaryButton title="+ Agregar" variant="accent" fullWidth={false} onPress={agregar} />
        </View>
      </View>
    </View>
  );

  const hoyCard = <TodayCard onVerCalendario={() => navigation.navigate('Calendario')} />;

  const listaDeIntegrantes = (
    <View style={styles.section}>
      <Text style={styles.sectionLabel} accessibilityRole="header">
        Integrantes ({integrantes.length})
      </Text>
      {integrantes.length === 0 ? (
        <EmptyState message="No hay integrantes registrados." />
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
                    nombreCompleto={nombreCompleto}
                    subt={`${TIPO_LABELS[item.tipo] ?? item.tipo}${edad !== null ? ` · ${edad} años` : ''}`}
                    tipo={item.tipo}
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
        </View>
      )}
    </View>
  );

  const listaDeMascotas = (
    <View style={styles.section}>
      <Text style={styles.sectionLabel} accessibilityRole="header">
        Mascotas ({mascotas.length})
      </Text>
      {mascotas.length === 0 ? (
        <EmptyState message="No hay mascotas registradas." />
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
                    nombre={item.nombre}
                    subt={item.raza ? `${item.especie} · ${item.raza}` : item.especie}
                    disabled={busy}
                    onPress={() => openProfile({ id: item.id, tipo: 'mascota', nombre: item.nombre, member: item })}
                    onLongPress={() => handleLongPress('mascota', item, item.nombre)}
                  />
                </FadeOutRow>
              </FadeSlideIn>
            );
          })}
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
  const listas = vacio ? primerIngreso : (
    <>
      {listaDeIntegrantes}
      {listaDeMascotas}
    </>
  );

  const cargando = (
    <View style={styles.section}>
      <View style={styles.grid}>
        <View style={styles.gridItem}><SkeletonMemberCard /></View>
        <View style={styles.gridItem}><SkeletonMemberCard /></View>
      </View>
    </View>
  );

  const errores = (!!error || !!actionError) && (
    <ErrorBanner
      message={error || actionError}
      onDismiss={error ? undefined : () => setActionError('')}
      onRetry={error ? refresh : undefined}
    />
  );

  return (
    <View style={styles.root}>
      {/* Halo radial muy sutil en la esquina inferior derecha, detrás de todo. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <AmbientHalo />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          desktop ? styles.scrollDesktop : styles.scrollMobile,
          { paddingTop: (desktop ? 24 : 12) + insets.top },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />}
      >
        <View style={styles.container}>
          {banner}
          {errores}

          {desktop ? (
            <View style={styles.columns}>
              <View style={styles.colLeft}>
                {loading ? cargando : listas}
              </View>
              <View style={styles.colRight}>{hoyCard}</View>
            </View>
          ) : (
            <View style={styles.stack}>
              {hoyCard}
              {loading ? cargando : listas}
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
  scrollDesktop: { paddingHorizontal: 32 },
  scrollMobile: { paddingHorizontal: 20 },
  container: { width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center', gap: 24 },

  // ---- banner cálido
  banner: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.terraPale,
    borderWidth: 1,
    borderColor: '#EFE2D8',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 28,
    minHeight: 168,
    justifyContent: 'center',
  },
  bannerDoodle: { position: 'absolute', right: 0, bottom: 0, opacity: 1 },
  bannerDoodleMobile: { top: 0, bottom: undefined, opacity: 0.75 },
  bannerText: { zIndex: 1, gap: 4, maxWidth: '62%' },
  bannerTitle: { fontSize: 28, lineHeight: 36, fontFamily: poppinsWeight('700'), color: colors.ink },
  bannerSummary: { fontSize: 16, lineHeight: 24, color: colors.textBody },
  bannerAction: { marginTop: 16, alignSelf: 'flex-start' },

  // ---- layout
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  colLeft: { flex: 64, gap: 24 },
  colRight: { flex: 36 },
  stack: { gap: 24 },
  section: { gap: 12 },
  sectionLabel: { fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { flexBasis: 280, flexGrow: 1, flexShrink: 1 },

  // ---- tarjetas de integrantes y mascotas
  cardWrap: { width: '100%' },
  cardWrapWeb: { transitionProperty: 'transform', transitionDuration: '150ms', transitionTimingFunction: 'ease-out' },
  cardWrapHover: { transform: [{ translateY: -2 }] },
  memberCard: {
    gap: 12,
    minHeight: 80,
    padding: 16,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 0,
  },
  memberCardHover: { borderColor: '#E8B9A5' },
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
