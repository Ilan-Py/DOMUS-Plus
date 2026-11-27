import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from '../components/PressScale';
import EntityAvatar from '../components/EntityAvatar';
import { LogoConNombre } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import api, { getList } from '../api/client';
import * as Clipboard from 'expo-clipboard';
import { mostrarToast } from '../components/ToastHost';
import CrossfadeIcon from '../components/CrossfadeIcon';
import Pulse from '../components/Pulse';

export const SIDEBAR_WIDTH = 248;
// Desde este ancho el menú pasa a barra lateral (escritorio).
export const SIDEBAR_BREAKPOINT = 900;
// Ancho máximo de la columna de contenido de las pantallas.
export const CONTENT_MAX_WIDTH = 880;

const ICONS = {
  Familia: { off: 'people-outline', on: 'people' },
  Calendario: { off: 'calendar-outline', on: 'calendar' },
  Cuenta: { off: 'person-outline', on: 'person' },
};

// "Saltar al contenido": primer elemento al que llega la tecla Tab. Invisible
// hasta recibir el foco; al activarlo, el foco pasa al primer control de la
// pantalla (fuera de la barra lateral) y se evita recorrer todo el menú.
function SkipLink() {
  const [visible, setVisible] = useState(false);
  if (Platform.OS !== 'web') return null;

  function saltar() {
    const foco = document.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]');
    for (const el of foco) {
      if (!el.closest('[role="navigation"]') && el.offsetParent !== null) {
        el.focus();
        return;
      }
    }
  }

  return (
    <Pressable
      onPress={saltar}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      accessibilityRole="link"
      accessibilityLabel="Saltar al contenido"
      style={[styles.skip, !visible && styles.skipHidden]}
    >
      <Text style={styles.skipText}>Saltar al contenido</Text>
    </Pressable>
  );
}

// Ítem del menú: ícono + texto grande, con fondo suave al pasar el mouse o
// presionar (y el fondo arena + terracota cuando es la pantalla actual).
function NavItem({ focused, icon, label, onPress }) {
  const [hover, setHover] = useState(false);
  return (
    <PressScale
      contentStyle={[styles.item, hover && !focused && styles.itemHover, focused && styles.itemActive]}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={24} color={focused ? colors.accentStrong : colors.iconWarm} />
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </PressScale>
  );
}

// Tarjeta del dueño entre el menú y el perfil: copia el código de invitación vigente (lo pide al
// servidor; si todavía no hay uno, genera el primero) para pasárselo a quien quiera sumar.
function InvitaCard() {
  const [copiado, setCopiado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function copiar() {
    if (cargando) return;
    setCargando(true);
    try {
      let codigo = null;
      try {
        const datos = await api.get('/api/familia/grupo/invitacion');
        codigo = datos?.codigo_invitacion || null;
      } catch {
        // sin endpoint o sin código todavía: se genera abajo
      }
      if (!codigo) {
        const datos = await api.post('/api/familia/grupo/invitacion');
        codigo = datos.codigo_invitacion;
      }
      await Clipboard.setStringAsync(codigo);
      mostrarToast('Código copiado');
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch (err) {
      mostrarToast(err?.mensaje || 'No pudimos copiar el código');
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.invita}>
      <Text style={styles.invitaTitle}>Sumá a tu familia</Text>
      <Text style={styles.invitaText}>Pasales el código para que se unan al grupo.</Text>
      <Pulse trigger={copiado} radio={10}>
        <PressScale
          contentStyle={styles.invitaBtn}
          onPress={copiar}
          disabled={cargando}
          accessibilityLabel="Copiar código de invitación"
        >
          <CrossfadeIcon a="copy-outline" b="checkmark" showB={copiado} size={20} color={colors.accentStrong} />
          <Text style={styles.invitaBtnText}>{copiado ? 'Copiado' : 'Copiar código'}</Text>
        </PressScale>
      </Pulse>
    </View>
  );
}

// Menú lateral para pantallas anchas (web): marca arriba, destinos con ícono y
// texto grande. Reemplaza a la barra inferior, que en escritorio queda
// estirada de borde a borde.
export default function SideBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { usuario, grupo } = useAuth();
  const [rol, setRol] = useState('');

  // Rol del usuario en el grupo (Dueño / Miembro) para la tarjeta de usuario.
  useEffect(() => {
    let activo = true;
    getList('/api/familia/grupo/miembros')
      .then((miembros) => {
        const yo = miembros.find((m) => m.usuario_id === usuario?.id);
        if (activo && yo) setRol(yo.rol === 'dueño' || yo.rol === 'dueno' ? 'Dueño' : 'Miembro');
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [usuario?.id, grupo?.id]);

  const cuentaIndex = state.routes.findIndex((r) => r.name === 'Cuenta');
  const enCuenta = state.index === cuentaIndex;

  return (
    <View
      style={[styles.bar, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}
      accessibilityRole="navigation"
    >
      <SkipLink />
      <View style={styles.brand}>
        <LogoConNombre variante="terracota" size={36} />
      </View>
      {/* Contexto inmediato: de qué grupo familiar es esta sesión. */}
      {!!grupo?.nombre && (
        <View style={styles.groupPill}>
          <Text style={styles.groupText} numberOfLines={1}>
            {grupo.nombre}
          </Text>
        </View>
      )}

      <View accessibilityRole="tablist" style={styles.tabs}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const icons = ICONS[route.name] || ICONS.Familia;

        function onPress() {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }

        return (
          <NavItem
            key={route.key}
            focused={focused}
            icon={focused ? icons.on : icons.off}
            label={route.name}
            onPress={onPress}
          />
        );
      })}
      </View>

      {rol === 'Dueño' && <InvitaCard />}

      {/* Anclada al pie: quién tiene la sesión abierta. Lleva a Cuenta. */}
      <View style={styles.userWrap}>
        <PressScale
          contentStyle={[styles.userCard, enCuenta && styles.itemActive]}
          onPress={() => navigation.navigate('Cuenta')}
          accessibilityRole="link"
          accessibilityLabel={`Tu cuenta: ${usuario?.nombre || ''} ${usuario?.apellido || ''}${rol ? `, ${rol}` : ''}`}
        >
          <EntityAvatar avatarId={usuario?.avatar_id} type="person" name={usuario?.nombre} apellido={usuario?.apellido} size={40} />
          <View style={styles.userText}>
            <Text style={styles.userName} numberOfLines={1}>
              {usuario?.nombre} {usuario?.apellido}
            </Text>
            {!!rol && <Text style={styles.userRole}>{rol}</Text>}
          </View>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    paddingHorizontal: 16,
    backgroundColor: colors.bgBase,
    borderRightWidth: 1,
    borderRightColor: colors.borderCard,
    gap: 4,
  },
  brand: { paddingHorizontal: 12, marginBottom: 20 },

  tabs: { gap: 4 },
  skip: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 100,
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.accentStrong,
  },
  skipHidden: { opacity: 0, pointerEvents: 'none' },
  skipText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.onAccent },
  groupPill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginLeft: 12,
    marginTop: -16,
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.badgeSand,
  },
  groupText: { fontSize: 14, lineHeight: 20, color: colors.textBody },
  invita: {
    marginTop: 16,
    padding: 16,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(42, 36, 33, 0.18)',
    backgroundColor: colors.arena,
  },
  invitaTitle: { fontSize: 16, lineHeight: 24, fontFamily: poppinsWeight('700'), color: colors.ink },
  invitaText: { fontSize: 14, lineHeight: 20, color: colors.textBody },
  invitaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: '#FFFFFF',
  },
  invitaBtnText: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.accentStrong },
  userWrap: {
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderCard,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  userText: { flex: 1 },
  userName: { fontSize: 15, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.ink },
  userRole: { fontSize: 14, lineHeight: 20, color: colors.textBody },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemHover: { backgroundColor: colors.surfaceSoftPressed },
  itemActive: { backgroundColor: colors.badgeSand },
  label: {
    fontSize: 17,
    fontFamily: poppinsWeight('600'),
    color: colors.textBody,
  },
  labelActive: { color: colors.accentStrong },
});
