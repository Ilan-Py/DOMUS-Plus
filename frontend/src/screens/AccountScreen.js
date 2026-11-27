import React, { useCallback, useState } from 'react';
import { mostrarToast } from '../components/ToastHost';
import { View, Text, StyleSheet, Share, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import api, { getList } from '../api/client';
import PrimaryButton from '../components/PrimaryButton';
import ErrorBanner from '../components/ErrorBanner';
import Skeleton from '../components/Skeleton';
import PressScale from '../components/PressScale';
import FormField from '../components/FormField';
import { confirmarDestructivo } from '../utils/confirm';
import { iniciales } from '../utils/displayFormat';
import { avatarTint } from '../theme/avatars';

// Layout (ver DESIGN.md): desde 1024px, dos columnas (38% perfil y seguridad / 62% grupo)
// en un contenedor de hasta 1040px; debajo, una sola columna en el mismo orden.
const DESKTOP_BREAKPOINT = 1024;
const CONTAINER_MAX_WIDTH = 1040;

// Doodle decorativo (casita) para la cabecera del grupo: trazo fino, sin texto.
function DoodleCasa() {
  return (
    <Svg width={104} height={104} viewBox="0 0 96 96" fill="none">
      <Path d="M10 46 L48 14 L86 46" stroke={colors.accentStrong} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 42 V82 H76 V42" stroke={colors.accentStrong} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M42 82 V60 H54 V82" stroke={colors.accentStrong} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M70 24 V14 H78 V30" stroke={colors.accentStrong} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={78} r={3} fill={colors.accentStrong} />
      <Circle cx={86} cy={74} r={2} fill={colors.accentStrong} />
    </Svg>
  );
}

// Doodle de un sobre para el bloque de invitación.
function DoodleSobre() {
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      <Rect x={5} y={10} width={30} height={22} rx={4} stroke={colors.accentStrong} strokeWidth={2} />
      <Path d="M6 13 L20 24 L34 13" stroke={colors.accentStrong} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Botón de sólo texto (Editar / Renombrar): sin ícono, fondo arena, 48dp.
function TextButton({ label, onPress, accessibilityLabel }) {
  return (
    <PressScale contentStyle={styles.textBtn} onPress={onPress} accessibilityLabel={accessibilityLabel || label}>
      <Text style={styles.textBtnText}>{label}</Text>
    </PressScale>
  );
}

// El backend guarda el rol como 'dueno' (sin ñ, Prisma no admite ñ en enums) y
// algunas versiones lo devuelven como 'dueño'. Se aceptan las dos.
const esRolDueno = (rol) => rol === 'dueño' || rol === 'dueno';
const rolLabel = (rol) => (esRolDueno(rol) ? 'Dueño' : 'Miembro');

// Fila navegable con chip de ícono + chevron — el mismo affordance que ya
// usan las cards de FamilyListScreen (avatar + texto + chevron), acá en
// versión "opción de configuración". Sin `onPress` se renderiza igual pero
// sin chevron ni feedback de presión: "Grupo familiar" es tocable sólo para
// el dueño (es el único que puede renombrarlo), y una fila que se hunde al
// tocarla sin hacer nada sería un affordance falso.
// Fila de configuración: ícono limpio (sin cajita de fondo), texto y chevron.
function SettingRow({ icon, label, value, onPress, disabled, tone, accessibilityLabel, last }) {
  const color = tone === 'danger' ? colors.limeDeep : colors.ink;
  const iconColor = tone === 'danger' ? colors.limeDeep : colors.iconWarm;
  const contenido = (
    <>
      <Ionicons name={icon} size={22} color={iconColor} />
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        {!!value && <Text style={styles.rowValue}>{value}</Text>}
      </View>
      {!!onPress && !disabled && tone !== 'danger' && (
        <Ionicons name="chevron-forward" size={20} color={colors.iconWarm} />
      )}
    </>
  );

  // Deshabilitada: todo el bloque (ícono, título y bajada) con la misma opacidad.
  const rowStyle = [styles.settingRow, !last && styles.rowDivider, disabled && styles.rowDisabled];
  if (!onPress || disabled) {
    return (
      <View style={rowStyle} accessibilityState={{ disabled: !!disabled }}>
        {contenido}
      </View>
    );
  }
  return (
    <PressScale
      contentStyle={rowStyle}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel || label}
    >
      {contenido}
    </PressScale>
  );
}

// Círculo con iniciales: sólo para personas (no para filas de configuración).
function Avatar({ nombre, apellido, size = 48 }) {
  const tinte = avatarTint('adulto');
  const ini = iniciales(nombre, apellido);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tinte.bg },
      ]}
    >
      {ini ? (
        <Text style={[styles.avatarText, { color: tinte.text, fontSize: size * 0.36 }]}>{ini}</Text>
      ) : (
        <Ionicons name="person" size={size * 0.45} color={tinte.text} />
      )}
    </View>
  );
}

export default function AccountScreen() {
  const { usuario, grupo, logout, salirDelGrupo, actualizarPerfil, renombrarGrupo } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= DESKTOP_BREAKPOINT;

  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilNombre, setPerfilNombre] = useState('');
  const [perfilApellido, setPerfilApellido] = useState('');
  const [perfilEmail, setPerfilEmail] = useState('');
  const [perfilError, setPerfilError] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const [editandoGrupo, setEditandoGrupo] = useState(false);
  const [grupoNombreInput, setGrupoNombreInput] = useState('');
  const [grupoError, setGrupoError] = useState('');
  const [guardandoGrupo, setGuardandoGrupo] = useState(false);

  const [mostrarPasswordForm, setMostrarPasswordForm] = useState(false);
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  const [miembros, setMiembros] = useState([]);
  const [loadingMiembros, setLoadingMiembros] = useState(true);
  const [miembrosError, setMiembrosError] = useState('');
  const [eliminandoId, setEliminandoId] = useState(null);

  const [codigoInvitacion, setCodigoInvitacion] = useState(null);
  const [generandoCodigo, setGenerandoCodigo] = useState(false);
  const [invitacionError, setInvitacionError] = useState('');
  const [copiado, setCopiado] = useState(false);

  const [saliendo, setSaliendo] = useState(false);
  const [salirError, setSalirError] = useState('');

  const fetchMiembros = useCallback(async () => {
    setLoadingMiembros(true);
    setMiembrosError('');
    try {
      const datos = await getList('/api/familia/grupo/miembros');
      setMiembros(datos);
    } catch (err) {
      setMiembrosError(err.mensaje);
    } finally {
      setLoadingMiembros(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMiembros();
    }, [fetchMiembros])
  );

  const miMembresia = miembros.find((m) => m.usuario_id === usuario?.id);
  const esDueno = esRolDueno(miMembresia?.rol);

  // El usuario de la cuenta no es un `integrante` — no tiene el campo `tipo`
  // (adulto/menor/mayor) ni fecha_nacimiento en /api/auth (ver AuthContext),
  // así que no hay dato con qué elegir entre las familias de tinte: cae
  // siempre en la de 'adulto'. Mismo mapa que usan las cards de
  // FamilyListScreen (theme/avatars.js), no un color nuevo acá.

  function confirmLogout() {
    confirmarDestructivo(
      'Cerrar sesión',
      '¿Seguro que querés cerrar sesión?',
      handleLogout,
      'Cerrar sesión'
    );
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      // RootNavigator en App.js cambia al stack de auth automáticamente al
      // quedar `token` en null — mismo patrón que login/register/crearGrupo.
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  function abrirEditarPerfil() {
    setPerfilNombre(usuario?.nombre || '');
    setPerfilApellido(usuario?.apellido || '');
    setPerfilEmail(usuario?.email || '');
    setPerfilError('');
    setEditandoPerfil(true);
  }

  function cancelarEditarPerfil() {
    setEditandoPerfil(false);
    setPerfilError('');
  }

  async function guardarPerfil() {
    setPerfilError('');
    setGuardandoPerfil(true);
    try {
      await actualizarPerfil({
        nombre: perfilNombre.trim(),
        apellido: perfilApellido.trim(),
        email: perfilEmail.trim(),
      });
      setEditandoPerfil(false);
    } catch (err) {
      setPerfilError(err.mensaje);
    } finally {
      setGuardandoPerfil(false);
    }
  }

  function abrirEditarGrupo() {
    setGrupoNombreInput(grupo?.nombre || '');
    setGrupoError('');
    setEditandoGrupo(true);
  }

  function cancelarEditarGrupo() {
    setEditandoGrupo(false);
    setGrupoError('');
  }

  async function guardarGrupo() {
    setGrupoError('');
    setGuardandoGrupo(true);
    try {
      await renombrarGrupo(grupoNombreInput.trim());
      setEditandoGrupo(false);
    } catch (err) {
      setGrupoError(err.mensaje);
    } finally {
      setGuardandoGrupo(false);
    }
  }

  function abrirPasswordForm() {
    setPassActual('');
    setPassNueva('');
    setPassConfirm('');
    setPasswordError('');
    setMostrarPasswordForm(true);
  }

  function cancelarPasswordForm() {
    setMostrarPasswordForm(false);
    setPasswordError('');
  }

  async function guardarPassword() {
    setPasswordError('');
    if (passNueva !== passConfirm) {
      setPasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setGuardandoPassword(true);
    try {
      await api.patch('/api/auth/password', { passwordActual: passActual, passwordNueva: passNueva });
      setMostrarPasswordForm(false);
      setPassActual('');
      setPassNueva('');
      setPassConfirm('');
    } catch (err) {
      setPasswordError(err.mensaje);
    } finally {
      setGuardandoPassword(false);
    }
  }

  async function handleGenerarInvitacion() {
    setInvitacionError('');
    setGenerandoCodigo(true);
    try {
      const datos = await api.post('/api/familia/grupo/invitacion');
      setCodigoInvitacion(datos.codigo_invitacion);
      setCopiado(false);
    } catch (err) {
      setInvitacionError(err.mensaje);
    } finally {
      setGenerandoCodigo(false);
    }
  }

  async function handleCopiarCodigo() {
    if (!codigoInvitacion) return;
    await Clipboard.setStringAsync(codigoInvitacion);
    setCopiado(true);
    mostrarToast('Código copiado');
    setTimeout(() => setCopiado(false), 1500);
  }

  async function handleCompartirCodigo() {
    if (!codigoInvitacion) return;
    try {
      await Share.share({
        message: `Unite a mi grupo familiar en DOMUS+ con el código: ${codigoInvitacion}`,
      });
    } catch {
      // Share.share puede rechazar si el usuario cierra el sheet sin elegir
      // nada — no es un error real, no hace falta mostrar nada.
    }
  }

  async function handleEliminarMiembro(miembro) {
    setMiembrosError('');
    setEliminandoId(miembro.usuario_id);
    try {
      await api.delete(`/api/familia/grupo/miembros/${miembro.usuario_id}`);
      await fetchMiembros();
    } catch (err) {
      setMiembrosError(err.mensaje);
    } finally {
      setEliminandoId(null);
    }
  }

  function confirmEliminarMiembro(miembro) {
    confirmarDestructivo(
      'Eliminar miembro',
      `¿Seguro que querés eliminar a ${miembro.nombre} ${miembro.apellido} del grupo familiar?`,
      () => handleEliminarMiembro(miembro)
    );
  }

  async function handleSalirGrupo() {
    setSalirError('');
    setSaliendo(true);
    try {
      // RootNavigator en App.js cambia a GroupSetupScreen automáticamente al
      // quedar `grupo` en null (mismo patrón que logout con `token`).
      await salirDelGrupo();
    } catch (err) {
      setSalirError(err.mensaje);
      setSaliendo(false);
    }
  }

  function confirmSalirGrupo() {
    confirmarDestructivo(
      'Salir del grupo',
      '¿Seguro que querés salir de este grupo familiar? Vas a dejar de ver sus integrantes, mascotas y recordatorios.',
      handleSalirGrupo,
      'Salir'
    );
  }

  // ---------------- bloques ----------------
  const perfilCard = (
    <View style={styles.card}>
      {editandoPerfil ? (
        <View style={styles.formPad}>
          <ErrorBanner message={perfilError} />
          <FormField label="Nombre" value={perfilNombre} onChangeText={setPerfilNombre} />
          <FormField label="Apellido" value={perfilApellido} onChangeText={setPerfilApellido} />
          <FormField
            label="Correo electrónico"
            value={perfilEmail}
            onChangeText={setPerfilEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ paddingBottom: 0 }}
          />
          <View style={styles.formActions}>
            <PrimaryButton title="Guardar" onPress={guardarPerfil} loading={guardandoPerfil} variant="accent" />
            <PrimaryButton title="Cancelar" onPress={cancelarEditarPerfil} variant="secondary" disabled={guardandoPerfil} />
          </View>
        </View>
      ) : (
        <View style={styles.profileBody}>
          <Avatar nombre={usuario?.nombre} apellido={usuario?.apellido} size={64} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileNombre} numberOfLines={2}>
              {usuario?.nombre} {usuario?.apellido}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{usuario?.email}</Text>
          </View>
          <TextButton label="Editar" onPress={abrirEditarPerfil} accessibilityLabel="Editar perfil" />
        </View>
      )}
    </View>
  );

  const seguridadCard = (
    <View style={styles.card}>
      <Text style={styles.cardLabel} accessibilityRole="header">Acceso y seguridad</Text>
      {mostrarPasswordForm ? (
        <View style={styles.formPad}>
          <Text style={styles.formTitle}>Cambiar contraseña</Text>
          <ErrorBanner message={passwordError} />
          <FormField label="Contraseña actual" value={passActual} onChangeText={setPassActual} secureTextEntry />
          <FormField label="Nueva contraseña" value={passNueva} onChangeText={setPassNueva} secureTextEntry />
          <FormField
            label="Confirmar nueva contraseña"
            value={passConfirm}
            onChangeText={setPassConfirm}
            secureTextEntry
            style={{ paddingBottom: 0 }}
          />
          <View style={styles.formActions}>
            <PrimaryButton title="Guardar" onPress={guardarPassword} loading={guardandoPassword} variant="accent" />
            <PrimaryButton title="Cancelar" onPress={cancelarPasswordForm} variant="secondary" disabled={guardandoPassword} />
          </View>
        </View>
      ) : (
        <SettingRow icon="key-outline" label="Cambiar contraseña" onPress={abrirPasswordForm} last />
      )}

      <View style={styles.hairline} />

      <PressScale
        contentStyle={styles.logoutRow}
        onPress={confirmLogout}
        disabled={loggingOut}
        accessibilityLabel="Cerrar sesión"
      >
        {loggingOut ? (
          <ActivityIndicator size="small" color={colors.limeDeep} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={22} color={colors.limeDeep} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.logoutText}>Cerrar sesión</Text>
              <Text style={styles.logoutHint}>Salir de tu cuenta en este dispositivo.</Text>
            </View>
          </>
        )}
      </PressScale>
    </View>
  );

  const grupoCard = (
    <View style={[styles.card, styles.cardNoPad]}>
      {/* Cabecera destacada con un doodle decorativo (casita) en la esquina. */}
      <View style={styles.banner}>
        <View style={styles.bannerDoodle} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no">
          <DoodleCasa />
        </View>
        {editandoGrupo ? (
          <View style={styles.bannerForm}>
            <ErrorBanner message={grupoError} />
            <FormField label="Nombre del grupo" value={grupoNombreInput} onChangeText={setGrupoNombreInput} style={{ paddingBottom: 0 }} />
            <View style={styles.formActions}>
              <PrimaryButton title="Guardar" onPress={guardarGrupo} loading={guardandoGrupo} variant="accent" />
              <PrimaryButton title="Cancelar" onPress={cancelarEditarGrupo} variant="secondary" disabled={guardandoGrupo} />
            </View>
          </View>
        ) : (
          <View style={styles.bannerText}>
            <Text style={styles.groupEyebrow} accessibilityRole="header">Grupo familiar</Text>
            <Text style={styles.groupName} numberOfLines={2}>{grupo?.nombre}</Text>
            {!loadingMiembros && !miembrosError && (
              <Text style={styles.groupSummary}>
                {miembros.length} {miembros.length === 1 ? 'integrante' : 'integrantes'}
              </Text>
            )}
            {esDueno && (
              <View style={styles.bannerAction}>
                <TextButton label="Renombrar" onPress={abrirEditarGrupo} accessibilityLabel="Renombrar grupo" />
              </View>
            )}
          </View>
        )}
      </View>

      {esDueno && (
        <View style={styles.inviteWrap}>
          {!!invitacionError && <ErrorBanner message={invitacionError} />}
          <PressScale
            contentStyle={styles.inviteBox}
            onPress={generandoCodigo ? null : handleGenerarInvitacion}
            disabled={generandoCodigo}
            accessibilityLabel={codigoInvitacion ? 'Generar otro código de invitación' : 'Invitar miembro'}
          >
            <DoodleSobre />
            <View style={styles.rowTextWrap}>
              <Text style={styles.inviteTitle}>
                {generandoCodigo ? 'Generando código…' : codigoInvitacion ? 'Generar otro código' : 'Invitar miembro'}
              </Text>
              <Text style={styles.inviteHint}>Generá un código para que se una a tu grupo</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.iconWarm} />
          </PressScale>

          {codigoInvitacion ? (
            <View style={styles.codigoBox}>
              <Text style={styles.codigoText} selectable>{codigoInvitacion}</Text>
              <View style={styles.codigoActions}>
                <PressScale contentStyle={styles.codigoActionBtn} onPress={handleCopiarCodigo} accessibilityLabel="Copiar código">
                  <Ionicons name={copiado ? 'checkmark' : 'copy-outline'} size={22} color={colors.ink} />
                </PressScale>
                <PressScale contentStyle={styles.codigoActionBtn} onPress={handleCompartirCodigo} accessibilityLabel="Compartir código">
                  <Ionicons name="share-outline" size={22} color={colors.ink} />
                </PressScale>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {loadingMiembros ? (
        <View style={styles.formPad}>
          <Skeleton width="100%" height={44} />
          <Skeleton width="100%" height={44} style={{ marginTop: 8 }} />
        </View>
      ) : miembrosError ? (
        <View style={styles.formPad}>
          <ErrorBanner message={miembrosError} onRetry={fetchMiembros} />
        </View>
      ) : (
        <>
          <Text style={styles.membersLabel} accessibilityRole="header">
            Miembros ({miembros.length})
          </Text>
          {miembros.map((m, i) => (
            <View key={m.usuario_id} style={[styles.miembroRow, i < miembros.length - 1 && styles.rowDivider]}>
              <Avatar nombre={m.nombre} apellido={m.apellido} size={40} />
              <Text style={styles.miembroNombre} numberOfLines={1}>
                {m.nombre} {m.apellido}
              </Text>
              <View style={styles.rolBadge}>
                <Text style={styles.rolBadgeText}>{rolLabel(m.rol)}</Text>
              </View>
              {esDueno && m.usuario_id !== usuario?.id && (
                <PressScale
                  contentStyle={styles.deleteBtn}
                  onPress={() => confirmEliminarMiembro(m)}
                  disabled={eliminandoId === m.usuario_id}
                  accessibilityLabel={`Eliminar a ${m.nombre}`}
                >
                  {eliminandoId === m.usuario_id ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  )}
                </PressScale>
              )}
            </View>
          ))}
        </>
      )}

      {!!salirError && (
        <View style={styles.formPad}>
          <ErrorBanner message={salirError} />
        </View>
      )}
      <View style={styles.footer}>
        {esDueno ? (
          <SettingRow
            icon="exit-outline"
            label="Salir del grupo"
            value="Como dueño, no podés salir del grupo."
            disabled
            last
          />
        ) : (
          <SettingRow
            icon="exit-outline"
            label={saliendo ? 'Saliendo…' : 'Salir del grupo'}
            tone="danger"
            onPress={saliendo ? null : confirmSalirGrupo}
            last
          />
        )}
      </View>
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
      >
        <View style={styles.container}>
          {/* Encabezado sin divisor: el título vive dentro del mismo contenedor que las tarjetas. */}
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">Mi cuenta</Text>
            <Text style={styles.subtitle}>Administrá tus datos personales y tu grupo familiar.</Text>
          </View>

          {desktop ? (
            <View style={styles.columns}>
              <View style={styles.colLeft}>
                {perfilCard}
                {seguridadCard}
              </View>
              <View style={styles.colRight}>{grupoCard}</View>
            </View>
          ) : (
            <View style={styles.stack}>
              {perfilCard}
              {seguridadCard}
              {grupoCard}
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
  container: { width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center' },

  header: { marginBottom: 24 },
  title: { fontSize: 26, lineHeight: 34, fontFamily: poppinsWeight('700'), color: colors.ink },
  subtitle: { fontSize: 16, lineHeight: 22, color: colors.textBody, marginTop: 4 },

  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  colLeft: { flex: 38, gap: 16 },
  colRight: { flex: 62 },
  stack: { gap: 16 },

  // Nivel 2: tarjeta blanca con borde fino y una sombra cálida casi imperceptible.
  card: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 0,
  },
  cardNoPad: { paddingBottom: 0 },
  cardLabel: {
    fontSize: 14,
    fontFamily: poppinsWeight('600'),
    color: colors.textBody,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  hairline: { height: 1, backgroundColor: '#EFE8DF', marginHorizontal: 16 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#EFE8DF' },
  formPad: { padding: 16 },
  formTitle: { fontSize: 17, fontFamily: poppinsWeight('700'), color: colors.ink, marginBottom: 12 },
  formActions: { gap: 12, marginTop: 20 },

  // Botón de sólo texto (Editar / Renombrar): fondo arena, 48dp.
  textBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.emptyBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBtnText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },

  // ---- perfil
  profileBody: { padding: 16, gap: 16 },
  profileInfo: { gap: 4 },
  profileNombre: { fontSize: 20, lineHeight: 28, fontFamily: poppinsWeight('700'), color: colors.ink },
  profileEmail: { fontSize: 15, color: colors.textBody },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: poppinsWeight('700'), letterSpacing: 0.5 },

  // ---- filas de configuración
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowDisabled: { opacity: 0.55 },
  rowTextWrap: { flex: 1 },
  rowLabel: { fontSize: 16, fontFamily: poppinsWeight('600') },
  rowValue: { fontSize: 14, lineHeight: 20, color: colors.textBody, marginTop: 4 },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoutText: { fontSize: 17, fontFamily: poppinsWeight('600'), color: colors.limeDeep },
  logoutHint: { fontSize: 14, lineHeight: 20, color: colors.textBody },

  // ---- grupo: cabecera destacada (nivel 3: terracota pálido)
  banner: {
    backgroundColor: colors.terraPale,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE8DF',
    overflow: 'hidden',
    padding: 16,
    paddingRight: 120, // deja libre la esquina del doodle
    minHeight: 132,
  },
  bannerDoodle: { position: 'absolute', right: 8, top: 8, opacity: 0.18 },
  bannerText: { gap: 4 },
  bannerForm: { paddingRight: 0, marginRight: -104 },
  bannerAction: { marginTop: 12, alignSelf: 'flex-start' },
  groupEyebrow: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.textBody },
  groupName: { fontSize: 22, lineHeight: 30, fontFamily: poppinsWeight('700'), color: colors.ink },
  groupSummary: { fontSize: 15, lineHeight: 22, color: colors.textBody },

  // ---- bloque "Invitar miembro" (nivel 3: arena)
  inviteWrap: { padding: 16, paddingBottom: 0, gap: 12 },
  inviteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: colors.sandBlock,
    minHeight: 72,
  },
  inviteTitle: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  inviteHint: { fontSize: 14, lineHeight: 20, color: colors.textBody, marginTop: 4 },
  codigoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 4,
    minHeight: 64,
    borderRadius: 10,
    backgroundColor: colors.dayTint,
  },
  codigoText: { fontSize: 22, fontFamily: poppinsWeight('700'), color: colors.ink, letterSpacing: 2 },
  codigoActions: { flexDirection: 'row' },
  codigoActionBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

  // ---- miembros
  membersLabel: {
    fontSize: 14,
    fontFamily: poppinsWeight('600'),
    color: colors.textBody,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  miembroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  miembroNombre: { flex: 1, fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  rolBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.badgeSand },
  rolBadgeText: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.badgeSandText },
  deleteBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -8 },

  // ---- pie: salir del grupo
  footer: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#EFE8DF' },
});
