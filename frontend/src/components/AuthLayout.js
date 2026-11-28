import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import { LogoConNombre } from './Logo';
import PressScale from './PressScale';
import EscenaHogar from './EscenaHogar';

// Estructura de Iniciar sesión, Crear cuenta y Unirme con un código (ronda de las pantallas de entrada):
//  - escritorio (≥ 900): 55 / 45. A la izquierda, una escena de papel que ocupa todo el alto (distinta por pantalla:
//    luz prendida, puerta abriéndose, felpudo de bienvenida; de noche, luna y ventanas encendidas), con el borde
//    derecho recortado a tijera que pisa apenas el lado del formulario. Abajo, tres sellitos de papel de confianza.
//  - móvil: la escena es un banner arriba (≈ 30 % del alto) con el borde inferior recortado; el formulario abajo.
// El formulario mide hasta 420 px, con campos de 52 px y texto de 16 px o más.
const DESKTOP_BREAKPOINT = 900;
const FORM_MAX_WIDTH = 420;
const FONDO_FORM = '#FFFDF9';

const SELLITOS = [
  { icono: 'lock-closed', texto: 'Sólo lo ve tu familia' },
  { icono: 'ban', texto: 'Sin publicidad' },
  { icono: 'text', texto: 'Letra grande, si la necesitás' },
];

const CARTA = { titulo: 'Familia García · 4 integrantes', texto: 'Próximo aviso: vacuna de Toby' };

function CambioDePantalla({ texto, etiqueta, onPress }) {
  return (
    <View style={styles.cambio}>
      {!!texto && <Text style={styles.cambioText}>{texto}</Text>}
      <PressScale contentStyle={styles.cambioBtn} onPress={onPress} accessibilityLabel={etiqueta}>
        <Text style={styles.cambioLink}>{etiqueta}</Text>
      </PressScale>
    </View>
  );
}

function Volver({ onPress, claro }) {
  return (
    <PressScale contentStyle={[styles.backBtn, claro && styles.backBtnClaro]} onPress={onPress} accessibilityLabel="Volver">
      <Ionicons name="arrow-back" size={22} color={colors.ink} />
      <Text style={styles.backText}>Volver</Text>
    </PressScale>
  );
}

// Canto vertical cortado a tijera (del color del formulario) que se come el borde derecho de la escena.
function CantoVertical() {
  const puntos = [];
  for (let i = 0; i <= 40; i += 1) {
    const r = Math.sin(i * 12.9898 + 7 * 78.233) * 43758.5453;
    puntos.push(`${(2 + (r - Math.floor(r)) * 8).toFixed(1)} ${(i * 2.5).toFixed(1)}`);
  }
  return (
    <View pointerEvents="none" style={styles.canto}>
      <Svg width="100%" height="100%" viewBox="0 0 10 100" preserveAspectRatio="none">
        <Path d={`M 10 0 L ${puntos.join(' L ')} L 10 100 Z`} fill="#00000014" transform="translate(-1.2 0)" />
        <Path d={`M 10 0 L ${puntos.join(' L ')} L 10 100 Z`} fill={FONDO_FORM} />
      </Svg>
    </View>
  );
}

function CantoInferior() {
  const puntos = [];
  for (let i = 0; i <= 30; i += 1) {
    const r = Math.sin(i * 12.9898 + 3 * 78.233) * 43758.5453;
    puntos.push(`${((i / 30) * 100).toFixed(1)} ${(2 + (r - Math.floor(r)) * 7).toFixed(1)}`);
  }
  return (
    <View pointerEvents="none" style={styles.cantoInferior}>
      <Svg width="100%" height="100%" viewBox="0 0 100 10" preserveAspectRatio="none">
        <Path d={`M 0 10 L ${puntos.join(' L ')} L 100 10 Z`} fill={FONDO_FORM} />
      </Svg>
    </View>
  );
}

export default function AuthLayout({ onBack, switchTexto, switchEtiqueta, onSwitch, panelTitulo, escena = 'login', children }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const escritorio = width >= DESKTOP_BREAKPOINT;

  const formulario = (
    <ScrollView style={styles.formScroll} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.column}>{children}</View>
    </ScrollView>
  );

  if (!escritorio) {
    return (
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <View style={[styles.banner, { height: Math.max(220, Math.round(height * 0.3)) + insets.top }]}>
            <EscenaHogar variante={escena} />
            <CantoInferior />
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <Volver onPress={onBack} claro />
              <View style={styles.pastilla}>
                <CambioDePantalla texto="" etiqueta={switchEtiqueta} onPress={onSwitch} />
              </View>
            </View>
          </View>
          <View style={[styles.column, styles.columnMovil]}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.split}>
        <View style={styles.panel}>
          <EscenaHogar variante={escena} carta={escena === 'login' ? CARTA : undefined} />
          <View style={styles.panelTop}>
            <Volver onPress={onBack} claro />
            <View style={styles.pastilla}>
              <LogoConNombre variante="terracota" size={32} fontSize={20} />
            </View>
          </View>
          {!!panelTitulo && (
            <View style={styles.panelTituloCaja}>
              <Text style={styles.panelTitulo} accessibilityRole="header">{panelTitulo}</Text>
            </View>
          )}
          <View style={styles.sellitos}>
            {SELLITOS.map((s, i) => (
              <View key={s.texto} style={[styles.sellito, { transform: [{ rotate: `${[-3, 2, -2][i]}deg` }] }]}>
                <Ionicons name={s.icono} size={18} color={colors.accentStrong} />
                <Text style={styles.sellitoTexto}>{s.texto}</Text>
              </View>
            ))}
          </View>
          <CantoVertical />
        </View>

        <View style={styles.derecha}>
          <View style={styles.derechaTop}>
            <CambioDePantalla texto={switchTexto} etiqueta={switchEtiqueta} onPress={onSwitch} />
          </View>
          {formulario}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const SOMBRA = Platform.select({
  web: { boxShadow: '3px 4px 0 rgba(42,36,33,0.16)' },
  default: { shadowColor: '#2A2421', shadowOffset: { width: 3, height: 4 }, shadowOpacity: 0.16, shadowRadius: 0, elevation: 3 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FONDO_FORM },
  split: { flex: 1, flexDirection: 'row' },

  // ---- escena (escritorio)
  panel: { flex: 55, position: 'relative', overflow: 'hidden', marginRight: -14, zIndex: 1 },
  panelTop: { position: 'absolute', top: 20, left: 24, right: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pastilla: { backgroundColor: 'rgba(255,253,249,0.92)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, ...SOMBRA },
  panelTituloCaja: { position: 'absolute', top: 96, left: 32, right: 64, maxWidth: 560 },
  panelTitulo: {
    alignSelf: 'flex-start',
    fontSize: 38,
    lineHeight: 46,
    fontFamily: SERIF_BOLD,
    color: colors.ink,
    backgroundColor: 'rgba(255,253,249,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    transform: [{ rotate: '-1deg' }],
    ...SOMBRA,
  },
  sellitos: { position: 'absolute', left: 24, right: 48, bottom: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sellito: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 44, borderRadius: 22, backgroundColor: '#FFFDF9', ...SOMBRA },
  sellitoTexto: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  canto: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 22 },

  // ---- móvil
  banner: { position: 'relative', overflow: 'hidden' },
  cantoInferior: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 16 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  columnMovil: { paddingHorizontal: 24, paddingTop: 20 },

  // ---- formulario
  derecha: { flex: 45, backgroundColor: FONDO_FORM },
  derechaTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, alignItems: 'flex-end', paddingHorizontal: 32, paddingTop: 16 },
  formScroll: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 72 },
  column: { width: '100%', maxWidth: FORM_MAX_WIDTH, alignSelf: 'center' },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingRight: 16 },
  backBtnClaro: { backgroundColor: 'rgba(255,253,249,0.92)', borderRadius: 14, paddingLeft: 12, ...SOMBRA },
  backText: { fontSize: 17, fontFamily: poppinsWeight('600'), color: colors.ink },
  cambio: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cambioText: { fontSize: 16, color: colors.textBody },
  cambioBtn: { minHeight: 48, paddingHorizontal: 8, justifyContent: 'center' },
  cambioLink: { fontSize: 16, color: colors.accentStrong, fontFamily: poppinsWeight('600'), textDecorationLine: 'underline' },
});
