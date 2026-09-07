import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Share, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, radii, shadow } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import api, { getList } from '../api/client';
import PrimaryButton from '../components/PrimaryButton';
import ScreenHeader from '../components/ScreenHeader';
import ErrorBanner from '../components/ErrorBanner';
import Skeleton from '../components/Skeleton';
import PressScale from '../components/PressScale';
import FormField from '../components/FormField';
import { confirmarDestructivo } from '../utils/confirm';
import { iniciales } from '../utils/displayFormat';
import { avatarTint } from '../theme/avatars';

const ROL_LABEL = { 'dueño': 'Dueño', miembro: 'Miembro' };

// Fila navegable con chip de ícono + chevron — el mismo affordance que ya
// usan las cards de FamilyListScreen (avatar + texto + chevron), acá en
// versión "opción de configuración". Sin `onPress` se renderiza igual pero
// sin chevron ni feedback de presión: "Grupo familiar" es tocable sólo para
// el dueño (es el único que puede renombrarlo), y una fila que se hunde al
// tocarla sin hacer nada sería un affordance falso.
function SettingRow({ icon, label, value, onPress, style, accessibilityLabel }) {
  const contenido = (
    <>
      <View style={styles.rowIconChip}>
        <Ionicons name={icon} size={17} color={colors.sageDeep} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!value && <Text style={styles.rowValue}>{value}</Text>}
      </View>
      {!!onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMutedLight} />}
    </>
  );

  if (!onPress) {
    return <View style={[styles.settingRow, style]}>{contenido}</View>;
  }

  return (
    <PressScale
      contentStyle={[styles.settingRow, style]}
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
  const esDueno = miMembresia?.rol === 'dueño';

  // El usuario de la cuenta no es un `integrante` — no tiene el campo `tipo`
  // (adulto/menor/mayor) ni fecha_nacimiento en /api/auth (ver AuthContext),
  // así que no hay dato con qué elegir entre las familias de tinte: cae
  // siempre en la de 'adulto'. Mismo mapa que usan las cards de
  // FamilyListScreen (theme/avatars.js), no un color nuevo acá.
  const tinteUsuario = avatarTint('adulto');
  const inicialesUsuario = iniciales(usuario?.nombre, usuario?.apellido);

  function confirmLogout() {
    // react-native-web no implementa los botones/callbacks de Alert.alert
    // (no-op silencioso ahí) — sin esta rama, "Cerrar sesión" no hacía nada
    // en web porque handleLogout nunca se disparaba.
    if (Platform.OS === 'web') {
      if (window.confirm('¿Seguro que querés cerrar sesión?')) {
        handleLogout();
      }
      return;
    }

    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que querés cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: handleLogout },
      ],
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

  return (
    <View style={styles.root}>
      <ScreenHeader title="Mi cuenta" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {editandoPerfil ? (
            <>
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
                <PrimaryButton title="Guardar" onPress={guardarPerfil} loading={guardandoPerfil} variant="success" fullWidth={false} />
                <PrimaryButton title="Cancelar" onPress={cancelarEditarPerfil} variant="secondary" fullWidth={false} disabled={guardandoPerfil} />
              </View>
            </>
          ) : (
            <View style={styles.profileHeaderRow}>
              <View style={[styles.avatar, { backgroundColor: tinteUsuario.bg }]}>
                {inicialesUsuario ? (
                  <Text style={[styles.avatarText, { color: tinteUsuario.text }]}>{inicialesUsuario}</Text>
                ) : (
                  <Ionicons name="person" size={22} color={tinteUsuario.text} />
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileNombre} numberOfLines={1}>
                  {usuario?.nombre} {usuario?.apellido}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>{usuario?.email}</Text>
              </View>
              <PressScale
                contentStyle={styles.editLinkBtn}
                onPress={abrirEditarPerfil}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Editar perfil"
              >
                <Ionicons name="pencil-outline" size={13} color={colors.textMuted} />
                <Text style={styles.editLinkText}>Editar</Text>
              </PressScale>
            </View>
          )}

          {editandoGrupo ? (
            <View style={styles.grupoEditWrap}>
              <Text style={styles.label}>Grupo familiar</Text>
              <ErrorBanner message={grupoError} />
              <FormField value={grupoNombreInput} onChangeText={setGrupoNombreInput} style={{ paddingBottom: 10 }} />
              <View style={styles.formActions}>
                <PrimaryButton title="Guardar" onPress={guardarGrupo} loading={guardandoGrupo} variant="success" fullWidth={false} />
                <PrimaryButton title="Cancelar" onPress={cancelarEditarGrupo} variant="secondary" fullWidth={false} disabled={guardandoGrupo} />
              </View>
            </View>
          ) : (
            <SettingRow
              icon="home-outline"
              label="Grupo familiar"
              value={grupo?.nombre}
              style={styles.settingRowDivided}
              onPress={esDueno ? abrirEditarGrupo : null}
              accessibilityLabel="Renombrar grupo"
            />
          )}
        </View>

        <View style={mostrarPasswordForm ? styles.card : styles.cardTight}>
          {mostrarPasswordForm ? (
            <View>
              <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Contraseña</Text>
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
                <PrimaryButton title="Guardar" onPress={guardarPassword} loading={guardandoPassword} variant="success" fullWidth={false} />
                <PrimaryButton title="Cancelar" onPress={cancelarPasswordForm} variant="secondary" fullWidth={false} disabled={guardandoPassword} />
              </View>
            </View>
          ) : (
            // Sin subtexto de "última modificación": /api/auth/password no
            // devuelve esa fecha y el perfil tampoco la trae (ver
            // AuthContext) — no se inventa un dato que no existe.
            <SettingRow
              icon="key-outline"
              label="Cambiar contraseña"
              onPress={abrirPasswordForm}
            />
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Miembros del grupo</Text>
            {/* Sólo el total: no hay ningún límite de plan del lado del
                backend (grupo_familiar no tiene columna de cupo, ver
                familiaController) contra el cual mostrar "N de M". */}
            {!loadingMiembros && !miembrosError && (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{miembros.length}</Text>
              </View>
            )}
          </View>

          {loadingMiembros ? (
            <>
              <Skeleton width="100%" height={44} style={{ marginTop: 10 }} />
              <Skeleton width="100%" height={44} style={{ marginTop: 8 }} />
            </>
          ) : miembrosError ? (
            <ErrorBanner message={miembrosError} onRetry={fetchMiembros} />
          ) : (
            <View style={styles.miembrosList}>
              {miembros.map((m) => (
                <View key={m.usuario_id} style={styles.miembroRow}>
                  <View style={styles.miembroInfo}>
                    <Text style={styles.miembroNombre}>{m.nombre} {m.apellido}</Text>
                    <View style={[styles.rolPill, m.rol === 'dueño' && styles.rolPillDueno]}>
                      <Text style={[styles.rolPillText, m.rol === 'dueño' && styles.rolPillTextDueno]}>
                        {ROL_LABEL[m.rol] ?? m.rol}
                      </Text>
                    </View>
                  </View>
                  {esDueno && m.usuario_id !== usuario?.id && (
                    <PressScale
                      contentStyle={styles.miembroDeleteBtn}
                      onPress={() => confirmEliminarMiembro(m)}
                      disabled={eliminandoId === m.usuario_id}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel={`Eliminar a ${m.nombre}`}
                    >
                      {eliminandoId === m.usuario_id ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      )}
                    </PressScale>
                  )}
                </View>
              ))}
            </View>
          )}

          {esDueno && (
            <View style={styles.invitacionWrap}>
              <ErrorBanner message={invitacionError} />
              {codigoInvitacion ? (
                <View style={styles.codigoBox}>
                  <Text style={styles.codigoText}>{codigoInvitacion}</Text>
                  <View style={styles.codigoActions}>
                    <PressScale
                      contentStyle={styles.codigoActionBtn}
                      onPress={handleCopiarCodigo}
                      accessibilityLabel="Copiar código"
                    >
                      <Ionicons name={copiado ? 'checkmark' : 'copy-outline'} size={16} color={colors.navy} />
                    </PressScale>
                    <PressScale
                      contentStyle={styles.codigoActionBtn}
                      onPress={handleCompartirCodigo}
                      accessibilityLabel="Compartir código"
                    >
                      <Ionicons name="share-outline" size={16} color={colors.navy} />
                    </PressScale>
                  </View>
                </View>
              ) : null}
              <PrimaryButton
                title={codigoInvitacion ? 'Regenerar código de invitación' : 'Generar código de invitación'}
                onPress={handleGenerarInvitacion}
                loading={generandoCodigo}
                // primary (relleno ink), no secondary (outline) — es la
                // acción principal de esta card, no una alternativa a otra.
                variant="primary"
              />
            </View>
          )}
        </View>

        {esDueno ? (
          <ErrorBanner
            variant="info"
            message="Como dueño del grupo no podés salir de él — por ahora, la única forma de dejar de administrarlo es eliminar el grupo completo (no disponible todavía desde la app)."
          />
        ) : (
          <>
            <ErrorBanner message={salirError} />
            <PrimaryButton
              title="Salir del grupo"
              onPress={confirmSalirGrupo}
              loading={saliendo}
              variant="danger"
            />
          </>
        )}

        <PressScale
          contentStyle={styles.logoutLinkBtn}
          onPress={confirmLogout}
          disabled={loggingOut}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Cerrar sesión"
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={colors.limeDeep} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={16} color={colors.limeDeep} />
              <Text style={styles.logoutLinkText}>Cerrar sesión</Text>
            </>
          )}
        </PressScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 18,
    // paddingBottom extra para que "Cerrar sesión" no termine bajo la tab
    // bar flotante al llegar al final del scroll.
    paddingBottom: 100,
    gap: 16,
  },
  card: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    paddingHorizontal: 20,
    paddingVertical: 22,
    ...shadow,
  },
  // Misma card, con el padding vertical reducido — una card que contiene una
  // sola SettingRow (que ya trae sus propios 12px arriba y abajo) se ve
  // desbalanceada con los 22 del padding normal.
  cardTight: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    paddingHorizontal: 20,
    paddingVertical: 10,
    ...shadow,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.navy,
    marginBottom: 4,
  },
  miembrosList: {
    marginTop: 8,
  },
  miembroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  miembroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  miembroNombre: {
    fontSize: 14.5,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
    flexShrink: 1,
  },
  rolPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.sage,
  },
  rolPillDueno: {
    backgroundColor: colors.avatarAdultBg,
  },
  rolPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.sageDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rolPillTextDueno: {
    color: colors.avatarAdultText,
  },
  miembroDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitacionWrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 10,
  },
  codigoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.sage,
    borderRadius: radii.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  codigoText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.sageDeep,
    letterSpacing: 2,
  },
  codigoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  codigoActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassStrong,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  // Mismo tamaño/forma que el avatar de MemberCard (FamilyListScreen): 46px,
  // radio 15. El tinte viene inline (ver tinteUsuario) — acá no queda ningún
  // color fijo.
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    letterSpacing: 0.5,
  },
  profileInfo: {
    flex: 1,
  },
  profileNombre: {
    fontSize: 15.5,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
  profileEmail: {
    fontSize: 12.5,
    fontWeight: '400',
    fontFamily: poppinsWeight('400'),
    color: colors.textMutedLight,
    marginTop: 1,
  },
  // Fila navegable (ver SettingRow) — el chip de ícono reusa el par
  // sage/sageDeep de reminderBadge.control, no una familia nueva.
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  // Cuando la fila comparte card con el header de perfil, el hairline la
  // separa de él (dentro de su propia card no hace falta).
  settingRowDivided: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowIconChip: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
  rowValue: {
    fontSize: 12.5,
    color: colors.textMutedLight,
    marginTop: 1,
  },
  grupoEditWrap: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countPill: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.sage,
    alignItems: 'center',
  },
  countPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.sageDeep,
  },
  editLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  // marginTop propio (además del gap:16 del contentContainer) — cerrar
  // sesión no pertenece al bloque de arriba (el aviso de dueño / el botón de
  // salir del grupo) y quedaba leyéndose como parte de él.
  logoutLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 10,
  },
  logoutLinkText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.limeDeep,
  },
});
