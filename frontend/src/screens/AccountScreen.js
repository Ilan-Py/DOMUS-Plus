import React, { useCallback, useState } from 'react';
import { mostrarToast } from '../components/ToastHost';
import { View, Text, StyleSheet, Share, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import api, { getList } from '../api/client';
import PrimaryButton from '../components/PrimaryButton';
import ErrorBanner from '../components/ErrorBanner';
import Skeleton from '../components/Skeleton';
import PressScale from '../components/PressScale';
import FormField from '../components/FormField';
import Pulse from '../components/Pulse';
import CrossfadeIcon from '../components/CrossfadeIcon';
import { confirmarDestructivo } from '../utils/confirm';
import { paper } from '../theme/paper';
import CasaRecorte from '../components/CasaRecorte';
import EntityAvatar from '../components/EntityAvatar';
import AvatarPicker from '../components/AvatarPicker';
import PaperCutout from '../components/PaperCutout';
import Logo from '../components/Logo';
import { openDialog } from '../components/DialogHost';
import { LEGAL } from '../utils/legal';
import { useFamily } from '../context/FamilyContext';
import { usePreferencias } from '../context/PreferenciasContext';
import { armarResumenFichas, entregarTexto } from '../utils/resumenFichas';

// Layout: contenedor de hasta 1440 px alineado a la izquierda. Desde 1280 px, 3 columnas (perfil y seguridad /
// grupo / preferencias y privacidad); en tablet (desde 768 px), 2 columnas; en móvil, una sola.
const DESKTOP_BREAKPOINT = 1024;
const TRES_COLUMNAS = 1280;
const DOS_COLUMNAS = 768;
const CONTAINER_MAX_WIDTH = 1440;

const OPCIONES_TEXTO = [
  { label: 'Normal', value: 'normal' },
  { label: 'Grande', value: 'grande' },
  { label: 'Muy grande', value: 'muygrande' },
];
const normalizar = (t) => (t || '').trim().toLowerCase();

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

export default function AccountScreen() {
  const { usuario, grupo, logout, salirDelGrupo, actualizarPerfil, renombrarGrupo } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= DESKTOP_BREAKPOINT;
  const columnas = width >= TRES_COLUMNAS ? 3 : width >= DOS_COLUMNAS ? 2 : 1;
  const navigation = useNavigation();
  const { integrantes } = useFamily();
  const { escala, setEscala, anticipados, setAnticipados } = usePreferencias();
  const [armandoResumen, setArmandoResumen] = useState(false);

  const [editandoPerfil, setEditandoPerfil] = useState(false);
  // true cuando se abrió desde el avatar: el formulario muestra sólo el selector de ícono.
  const [soloIcono, setSoloIcono] = useState(false);
  const [perfilNombre, setPerfilNombre] = useState('');
  const [perfilAvatar, setPerfilAvatar] = useState(null);
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
      'Cerrar sesión',
      'logout'
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

  // "Mi ficha": el integrante del grupo que lleva mi nombre y apellido. Si todavía no está cargado, se avisa
  // y se lleva a Familia para sumarse.
  const miFicha = integrantes.find(
    (i) => normalizar(i.nombre) === normalizar(usuario?.nombre) && normalizar(i.apellido) === normalizar(usuario?.apellido)
  );
  function verMiFicha() {
    if (miFicha) {
      navigation.navigate('Familia', {
        screen: 'Emergency',
        params: { id: miFicha.id, nombre: `${miFicha.nombre} ${miFicha.apellido}` },
      });
    } else {
      mostrarToast('Todavía no estás cargado en Familia. Sumate como integrante para tener tu ficha.');
      navigation.navigate('Familia');
    }
  }

  async function descargarResumen() {
    if (armandoResumen) return;
    setArmandoResumen(true);
    try {
      const texto = await armarResumenFichas({ grupoNombre: grupo?.nombre, integrantes });
      await entregarTexto('fichas-de-emergencia.txt', texto);
      mostrarToast('Resumen de fichas listo');
    } catch {
      mostrarToast('No pudimos armar el resumen. Probá de nuevo.');
    } finally {
      setArmandoResumen(false);
    }
  }

  function abrirCambiarIcono() {
    abrirEditarPerfil();
    setSoloIcono(true);
  }

  function abrirEditarPerfil() {
    setSoloIcono(false);
    setPerfilNombre(usuario?.nombre || '');
    setPerfilApellido(usuario?.apellido || '');
    setPerfilEmail(usuario?.email || '');
    setPerfilAvatar(usuario?.avatar_id || null);
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
        avatar_id: perfilAvatar,
      });
      setEditandoPerfil(false);
      fetchMiembros(); // la lista de miembros muestra el avatar nuevo
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
    <View {...paper('cartulina')} style={styles.card}>
      {/* Pestaña de papel en terracota suave, colgando del borde superior */}
      <View pointerEvents="none" style={styles.pestana} />
      {editandoPerfil ? (
        <View style={styles.formPad}>
          <Text style={styles.tituloTarjeta} accessibilityRole="header">{soloIcono ? 'Cambiar ícono' : 'Mi perfil'}</Text>
          <ErrorBanner message={perfilError} />
          {soloIcono ? (
            <AvatarPicker mode="all" value={perfilAvatar} onChange={setPerfilAvatar} name={perfilNombre} apellido={perfilApellido} />
          ) : (
            <>
              <View style={styles.filaDos}>
                <FormField label="Nombre" value={perfilNombre} onChangeText={setPerfilNombre} style={styles.mitad} />
                <FormField label="Apellido" value={perfilApellido} onChangeText={setPerfilApellido} style={styles.mitad} />
              </View>
              <FormField
                label="Correo electrónico"
                value={perfilEmail}
                onChangeText={setPerfilEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ paddingBottom: 0 }}
              />
            </>
          )}
          <View style={styles.formActionsFila}>
            <View style={styles.mitad}>
              <PrimaryButton title="Guardar" onPress={guardarPerfil} loading={guardandoPerfil} variant="accent" />
            </View>
            <View style={styles.mitad}>
              <PrimaryButton title="Cancelar" onPress={cancelarEditarPerfil} variant="secondary" disabled={guardandoPerfil} />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.profileBody}>
          {/* Título a la izquierda y "Editar" chico en la esquina superior derecha (patrón de siempre). */}
          <View style={styles.perfilCab}>
            <Text style={styles.tituloPerfil} accessibilityRole="header">Mi perfil</Text>
            <PressScale contentStyle={styles.editarEsquina} onPress={abrirEditarPerfil} accessibilityLabel="Editar perfil">
              <View style={styles.editarChip}>
                <Text style={styles.editarChipText}>Editar</Text>
              </View>
            </PressScale>
          </View>
          {/* Tocar el avatar sirve sólo para cambiar el ícono. */}
          <PressScale
            style={styles.avatarWrap}
            contentStyle={styles.avatarBtn}
            onPress={abrirCambiarIcono}
            accessibilityLabel="Cambiar mi ícono"
          >
            <EntityAvatar avatarId={usuario?.avatar_id} type="person" name={usuario?.nombre} apellido={usuario?.apellido} size={64} />
            <View pointerEvents="none" style={styles.avatarEdit}>
              <Ionicons name="pencil" size={13} color={colors.onAccent} />
            </View>
          </PressScale>
          <View style={styles.profileInfo}>
            <Text style={styles.profileNombre} numberOfLines={2}>
              {usuario?.nombre} {usuario?.apellido}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{usuario?.email}</Text>
            <PressScale contentStyle={styles.fichaLink} onPress={verMiFicha} accessibilityLabel="Ver mi ficha de emergencia">
              <Text style={styles.fichaLinkText}>Ver mi ficha de emergencia</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accentStrong} />
            </PressScale>
          </View>
        </View>
      )}
    </View>
  );

  const seguridadCard = (
    <View {...paper('cartulina')} style={styles.card}>
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

    </View>
  );

  // Botón independiente, bien separado de "Cambiar contraseña" para evitar toques accidentales.
  const cerrarSesionBtn = (
    <PressScale
      style={styles.logoutWrap}
      contentStyle={styles.logoutBtn}
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
  );

  const grupoCard = (
    <View {...paper('cartulina')} style={[styles.card, styles.cardNoPad]}>
      {/* Cabecera destacada con un doodle decorativo (casita) en la esquina. */}
      <View style={styles.banner}>
        <View style={styles.bannerDoodle} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no">
          <CasaRecorte size={100} />
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
          <View {...paper('lift')} style={styles.inviteLift}>
          <PressScale
            contentStyle={styles.inviteBox}
            onPress={generandoCodigo ? null : handleGenerarInvitacion}
            disabled={generandoCodigo}
            accessibilityLabel={codigoInvitacion ? 'Generar otro código de invitación' : 'Invitar miembro'}
          >
            <Ionicons name="mail-open-outline" size={30} color={colors.salvia} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.inviteTitle}>
                {generandoCodigo ? 'Generando código…' : codigoInvitacion ? 'Generar otro código' : 'Invitar miembro'}
              </Text>
              <Text style={styles.inviteHint}>Generá un código para que se una a tu grupo</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.salvia} />
          </PressScale>
          </View>

          {codigoInvitacion ? (
            <Pulse trigger={copiado} style={styles.codigoBox}>
              <Text style={styles.codigoText} selectable>{codigoInvitacion}</Text>
              <View style={styles.codigoActions}>
                <PressScale contentStyle={styles.codigoActionBtn} onPress={handleCopiarCodigo} accessibilityLabel="Copiar código">
                  <CrossfadeIcon a="copy-outline" b="checkmark" showB={copiado} size={22} color={colors.ink} />
                </PressScale>
                <PressScale contentStyle={styles.codigoActionBtn} onPress={handleCompartirCodigo} accessibilityLabel="Compartir código">
                  <Ionicons name="share-outline" size={22} color={colors.ink} />
                </PressScale>
              </View>
            </Pulse>
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
              <EntityAvatar avatarId={m.avatar_id} type="person" name={m.nombre} apellido={m.apellido} size={40} />
              <Text style={styles.miembroNombre} numberOfLines={1}>
                {m.nombre} {m.apellido}
              </Text>
              <View style={[styles.rolBadge, esRolDueno(m.rol) && styles.rolBadgeDueno]}>
                <Text style={[styles.rolBadgeText, esRolDueno(m.rol) && styles.rolBadgeDuenoText]}>{rolLabel(m.rol)}</Text>
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
          <Text style={styles.sosDueno}>Sos el dueño del grupo</Text>
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

  const preferenciasCard = (
    <View {...paper('cartulina')} style={styles.card}>
      <Text style={styles.cardLabel} accessibilityRole="header">Preferencias</Text>
      <View style={styles.formPad}>
        <Text style={styles.prefTitulo}>Tamaño de texto</Text>
        <Text style={styles.prefAyuda}>Se aplica a toda la app, en este dispositivo.</Text>
        {/* Riel arena con los tres botones adentro: un segmented control como el de cualquier app. */}
        <View style={styles.escalas} accessibilityRole="radiogroup" accessibilityLabel="Tamaño de texto">
          {OPCIONES_TEXTO.map((o) => {
            const on = escala === o.value;
            return (
              <PressScale
                key={o.value}
                style={styles.escalaCelda}
                contentStyle={[styles.escalaBtn, on && styles.escalaBtnOn]}
                onPress={() => setEscala(o.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on, selected: on }}
                accessibilityLabel={o.label}
              >
                <Text style={[styles.escalaTexto, on && styles.escalaTextoOn]} numberOfLines={1} adjustsFontSizeToFit>
                  {o.label}
                </Text>
              </PressScale>
            );
          })}
        </View>
      </View>

      <View style={styles.hairline} />

      <PressScale
        contentStyle={styles.toggleFila}
        onPress={() => setAnticipados(!anticipados)}
        accessibilityRole="switch"
        accessibilityState={{ checked: anticipados }}
        accessibilityLabel="Recordatorios anticipados: recibir aviso antes de cada dosis o turno"
      >
        <View style={styles.rowTextWrap}>
          <Text style={styles.prefTitulo}>Recordatorios anticipados</Text>
          <Text style={styles.prefAyuda}>Recibir aviso 30 minutos antes de cada dosis o turno (en el celular).</Text>
        </View>
        <View style={[styles.pista, anticipados && styles.pistaOn]}>
          <View style={[styles.perilla, anticipados && styles.perillaOn]} />
        </View>
      </PressScale>
    </View>
  );

  const privacidadCard = (
    <View {...paper('cartulina')} style={styles.card}>
      <View style={styles.privCuerpo}>
        <View style={styles.privHead}>
          <PaperCutout icon="shield" tinte="salvia" size={52} rotate={-3} />
          <Text style={styles.privTitulo} accessibilityRole="header">Privacidad y datos</Text>
        </View>
        <Text style={styles.privTexto}>
          Solo los miembros de {grupo?.nombre || 'tu grupo familiar'} pueden ver esta información.
        </Text>
        <PressScale
          contentStyle={styles.privBtn}
          onPress={descargarResumen}
          disabled={armandoResumen || integrantes.length === 0}
          accessibilityLabel="Descargar resumen de fichas de emergencia"
        >
          {armandoResumen ? (
            <ActivityIndicator size="small" color={colors.salvia} />
          ) : (
            <Ionicons name="download-outline" size={20} color={colors.salvia} />
          )}
          <Text style={styles.privBtnText}>{armandoResumen ? 'Armando resumen…' : 'Descargar resumen de fichas'}</Text>
        </PressScale>
        {integrantes.length === 0 && <Text style={styles.prefAyuda}>Cuando sumes integrantes, vas a poder descargar sus fichas.</Text>}
      </View>
    </View>
  );

  // Ayuda rápida: dos explicaciones cortas, en un cuadro de diálogo (no hay páginas de ayuda aparte).
  function verAyuda(tema) {
    const textos = {
      invitar: {
        title: 'Cómo invitar a tu familia',
        message:
          '1. Si sos el dueño del grupo, tocá «Copiar código» en el menú o «Invitar miembro» en esta pantalla.\n\n2. Pasale el código a quien quieras sumar.\n\n3. Esa persona crea su cuenta y elige «Unirme con un código de invitación».',
      },
      ficha: {
        title: 'Cómo usar la ficha de emergencia',
        message:
          'En Familia, tocá «Emergencia» en la tarjeta de la persona. Cargá tipo de sangre, alergias y notas, y sumá contactos para llamar con un toque.\n\nPara pasársela a un médico, usá «Copiar resumen» arriba a la derecha de la ficha.',
      },
    };
    const t = textos[tema];
    openDialog({ variante: 'info', title: t.title, message: t.message, actions: [{ label: 'Entendido', variant: 'accent' }] });
  }
  function verLegal(clave) {
    const t = LEGAL[clave];
    openDialog({ variante: 'info', title: t.titulo, message: t.parrafos.join('\n\n'), actions: [{ label: 'Entendido', variant: 'accent' }] });
  }

  const ayudaCard = (
    <View {...paper('cartulina')} style={styles.card}>
      <Text style={styles.cardLabel} accessibilityRole="header">Ayuda rápida</Text>
      <PressScale contentStyle={styles.ayudaFila} onPress={() => verAyuda('invitar')} accessibilityLabel="Cómo invitar a tu familia">
        <Ionicons name="help-circle-outline" size={22} color={colors.salvia} />
        <Text style={styles.ayudaTexto}>Cómo invitar a tu familia</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.iconWarm} />
      </PressScale>
      <View style={styles.hairline} />
      <PressScale contentStyle={styles.ayudaFila} onPress={() => verAyuda('ficha')} accessibilityLabel="Cómo usar la ficha de emergencia">
        <Ionicons name="help-circle-outline" size={22} color={colors.salvia} />
        <Text style={styles.ayudaTexto}>Cómo usar la ficha de emergencia</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.iconWarm} />
      </PressScale>
    </View>
  );

  // Pie discreto al fondo del área principal.
  const pie = (
    <View style={styles.pie}>
      <Text style={styles.pieMarca}>DOMUS+ · Salud familiar</Text>
      <View style={styles.pieLinks}>
        <PressScale contentStyle={styles.pieLink} onPress={() => verLegal('privacidad')} accessibilityLabel="Privacidad">
          <Text style={styles.pieLinkText}>Privacidad</Text>
        </PressScale>
        <Text style={styles.pieSep}>·</Text>
        <PressScale contentStyle={styles.pieLink} onPress={() => verLegal('terminos')} accessibilityLabel="Términos">
          <Text style={styles.pieLinkText}>Términos</Text>
        </PressScale>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Marca de agua: el corazón de DOMUS+ al 3,5 %, en la esquina inferior derecha del fondo. */}
      <View style={styles.marcaAgua} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no">
        <Logo variante="terracota" size={380} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          desktop ? styles.scrollDesktop : styles.scrollMobile,
          { paddingTop: (desktop ? 32 : 12) + insets.top },
        ]}
      >
        <View style={[styles.container, desktop && styles.containerIzq]}>
          {/* Encabezado sin divisor: el título vive dentro del mismo contenedor que las tarjetas. */}
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">Mi cuenta</Text>
            <Text style={styles.subtitle}>Administrá tus datos personales y tu grupo familiar.</Text>
          </View>

          {columnas === 3 ? (
            <View style={styles.columns}>
              <View style={styles.col}>
                {perfilCard}
                {seguridadCard}
                {cerrarSesionBtn}
              </View>
              <View style={styles.col}>
                {grupoCard}
                {privacidadCard}
              </View>
              <View style={styles.col}>
                {preferenciasCard}
                {ayudaCard}
              </View>
            </View>
          ) : columnas === 2 ? (
            <View style={styles.stack}>
              <View style={styles.columns}>
                <View style={styles.col}>
                  {perfilCard}
                  {seguridadCard}
                  {cerrarSesionBtn}
                </View>
                <View style={styles.col}>
                  {grupoCard}
                  {privacidadCard}
                </View>
              </View>
              <View style={styles.columns}>
                <View style={styles.col}>{preferenciasCard}</View>
                <View style={styles.col}>{ayudaCard}</View>
              </View>
            </View>
          ) : (
            <View style={styles.stack}>
              {perfilCard}
              {seguridadCard}
              {cerrarSesionBtn}
              {grupoCard}
              {privacidadCard}
              {preferenciasCard}
              {ayudaCard}
            </View>
          )}

          {/* Separador flexible: empuja el pie al fondo cuando el contenido es corto. */}
          <View style={styles.pieEspacio} />
          {pie}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingBottom: 112 },
  scrollDesktop: { paddingHorizontal: 48 },
  scrollMobile: { paddingHorizontal: 20 },
  container: { width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center', flexGrow: 1 },
  // Escritorio: alineado a la izquierda, pegado a la barra lateral (sin pasillo vacío).
  containerIzq: { alignSelf: 'flex-start' },

  header: { marginBottom: 28 },
  title: { fontSize: 26, lineHeight: 34, fontFamily: poppinsWeight('700'), color: colors.ink },
  subtitle: { fontSize: 16, lineHeight: 22, color: colors.textBody, marginTop: 4 },

  columns: { flexDirection: 'row', gap: 28, alignItems: 'flex-start' },
  col: { flex: 1, gap: 28, minWidth: 0 },
  stack: { gap: 28 },

  // Nivel 2: tarjeta blanca con borde fino y una sombra cálida casi imperceptible.
  card: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
    overflow: 'hidden',
    // Cartulina: en web, sombra de dos capas vía theme/paper.js; en nativo, una corta y nítida.
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 0,
    elevation: 2,
  },
  cardNoPad: { paddingBottom: 0 },
  // Título de tarjeta en la serif de la marca.
  cardLabel: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: SERIF_BOLD,
    color: colors.ink,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  tituloTarjeta: { fontSize: 22, lineHeight: 30, fontFamily: SERIF_BOLD, color: colors.ink, marginBottom: 12 },
  // Divisores punteados cálidos en lugar de líneas sólidas.
  hairline: { height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(42, 36, 33, 0.16)', marginHorizontal: 24 },
  rowDivider: { borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: 'rgba(42, 36, 33, 0.16)' },
  formPad: { padding: 24 },
  formTitle: { fontSize: 17, fontFamily: poppinsWeight('700'), color: colors.ink, marginBottom: 12 },
  formActions: { gap: 12, marginTop: 20 },
  filaDos: { flexDirection: 'row', gap: 12 },
  mitad: { flex: 1, minWidth: 0 },
  formActionsFila: { flexDirection: 'row', gap: 12, marginTop: 20 },

  // ---- ayuda rápida
  ayudaFila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 24, paddingVertical: 14 },
  ayudaTexto: { flex: 1, fontSize: 16, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.ink },

  // ---- pie y marca de agua
  marcaAgua: { position: 'absolute', right: -60, bottom: -60, opacity: 0.035 },
  pieEspacio: { flexGrow: 1, minHeight: 40 },
  pie: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: 'rgba(42, 36, 33, 0.14)',
  },
  pieMarca: { fontSize: 14, lineHeight: 20, color: colors.textBody },
  pieLinks: { flexDirection: 'row', alignItems: 'center' },
  pieLink: { minHeight: 48, paddingHorizontal: 8, justifyContent: 'center' },
  pieLinkText: { fontSize: 14, lineHeight: 20, color: colors.textBody, textDecorationLine: 'underline' },
  pieSep: { fontSize: 14, color: colors.textBody },

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
  profileBody: { padding: 24, paddingTop: 28, gap: 16 },
  // Pestaña de papel colgando del borde superior de la tarjeta de perfil.
  pestana: {
    position: 'absolute',
    top: 0,
    left: 24,
    width: 64,
    height: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'rgba(194, 70, 35, 0.32)',
  },
  perfilCab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tituloPerfil: { fontSize: 22, lineHeight: 30, fontFamily: SERIF_BOLD, color: colors.ink },
  // El área táctil mide 48 px; el chip visible es más chico.
  editarEsquina: { minHeight: 48, justifyContent: 'center', paddingLeft: 8 },
  editarChip: { height: 36, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.emptyBg, alignItems: 'center', justifyContent: 'center' },
  editarChipText: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.ink },
  avatarBtn: { alignSelf: 'flex-start' },
  profileInfo: { gap: 4 },
  avatarWrap: { alignSelf: 'flex-start' },
  avatarEdit: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentStrong,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fichaLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, minHeight: 48 },
  fichaLinkText: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.accentStrong },

  // ---- preferencias
  prefTitulo: { fontSize: 16, lineHeight: 24, fontFamily: poppinsWeight('600'), color: colors.ink },
  prefAyuda: { fontSize: 14, lineHeight: 20, color: colors.textBody, marginTop: 2 },
  // Riel arena: un solo contenedor para los tres botones.
  escalas: { flexDirection: 'row', gap: 4, marginTop: 12, padding: 4, borderRadius: 12, backgroundColor: '#F3EAE0' },
  escalaCelda: { flex: 1 },
  escalaBtn: {
    minHeight: 48,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Elegido: pieza blanca apoyada sobre el riel, con sombra corta.
  escalaBtnOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 1,
  },
  escalaTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.ink },
  escalaTextoOn: { color: colors.accentStrong },
  toggleFila: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 72, paddingHorizontal: 24, paddingVertical: 14 },
  pista: { width: 52, height: 30, borderRadius: 15, backgroundColor: '#D9D0C5', justifyContent: 'center', paddingHorizontal: 3 },
  pistaOn: { backgroundColor: colors.salvia },
  perilla: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },
  perillaOn: { alignSelf: 'flex-end' },

  // ---- privacidad y datos
  privCuerpo: { padding: 24, gap: 12 },
  privHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  escudo: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.salviaSoft, alignItems: 'center', justifyContent: 'center' },
  privTitulo: { flex: 1, fontSize: 22, lineHeight: 30, fontFamily: SERIF_BOLD, color: colors.ink },
  privTexto: { fontSize: 15, lineHeight: 22, color: colors.textBody },
  privBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(74, 107, 93, 0.45)',
    backgroundColor: colors.salviaSoft,
  },
  privBtnText: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.salvia },
  profileNombre: { fontSize: 20, lineHeight: 28, fontFamily: poppinsWeight('700'), color: colors.ink },
  profileEmail: { fontSize: 15, color: colors.textBody },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: poppinsWeight('700'), letterSpacing: 0.5 },

  // ---- filas de configuración
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  rowDisabled: { opacity: 0.55 },
  rowTextWrap: { flex: 1 },
  rowLabel: { fontSize: 16, fontFamily: poppinsWeight('600') },
  rowValue: { fontSize: 14, lineHeight: 20, color: colors.textBody, marginTop: 4 },
  // Botón de cerrar sesión: independiente, con borde punteado y aire arriba para no tocarlo sin querer.
  logoutWrap: { marginTop: 8 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(170, 69, 29, 0.45)',
  },
  logoutText: { fontSize: 17, fontFamily: poppinsWeight('600'), color: colors.limeDeep },
  logoutHint: { fontSize: 14, lineHeight: 20, color: colors.textBody },

  // ---- grupo: cabecera destacada (nivel 3: terracota pálido)
  banner: {
    backgroundColor: colors.arena,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderBottomColor: 'rgba(42, 36, 33, 0.16)',
    overflow: 'hidden',
    padding: 24,
    paddingRight: 128, // deja libre la esquina del doodle
    minHeight: 132,
  },
  bannerDoodle: { position: 'absolute', right: 16, top: 12 },
  bannerText: { gap: 4 },
  bannerForm: { paddingRight: 0, marginRight: -104 },
  bannerAction: { marginTop: 12, alignSelf: 'flex-start' },
  groupEyebrow: { fontSize: 22, lineHeight: 30, fontFamily: SERIF_BOLD, color: colors.ink },
  groupName: { fontSize: 17, lineHeight: 24, fontFamily: poppinsWeight('600'), color: colors.textBody },
  groupSummary: { fontSize: 15, lineHeight: 22, color: colors.textBody },

  // ---- bloque "Invitar miembro" (nivel 3: arena)
  inviteWrap: { padding: 24, paddingBottom: 0, gap: 12 },
  inviteLift: { borderRadius: 10 },
  // Destacado con acento salvia: borde punteado suave sobre fondo salvia claro.
  inviteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(74, 107, 93, 0.45)',
    backgroundColor: colors.salviaSoft,
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  miembroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  miembroNombre: { flex: 1, fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  rolBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.badgeSand },
  rolBadgeText: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.badgeSandText },
  // Dueño: ocre mostaza suave. El texto va en un ocre más oscuro para mantener el contraste (#C88D32 sobre
  // #FDF3E1 no llega a 3:1); el borde sí usa el ocre de la paleta.
  rolBadgeDueno: { backgroundColor: colors.ocreSoft, borderWidth: 1, borderColor: colors.ocre },
  rolBadgeDuenoText: { color: '#7A5112' },
  deleteBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -8 },

  // ---- pie: salir del grupo
  footer: { marginTop: 8, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: 'rgba(42, 36, 33, 0.16)' },
  sosDueno: { fontSize: 14, lineHeight: 20, color: colors.textBody, textAlign: 'center', paddingVertical: 16 },
});
