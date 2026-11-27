import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import Logo, { LogoConNombre } from './Logo';
import PressScale from './PressScale';
import { paper } from '../theme/paper';

// Estructura compartida por Iniciar sesión y Crear cuenta (pantalla dividida):
//  - escritorio (≥900): panel cálido inset a la izquierda (volver + logo / titular, puntos
//    y una mini-tarjeta del producto / pie con marca de agua) y la mitad derecha en blanco
//    con el formulario directo, sin caja, y el cambio de pantalla arriba a la derecha.
//  - móvil: barra mínima (volver / cambio) y el formulario sobre blanco.
const BANDA = '#F3EAE0';
const DESKTOP_BREAKPOINT = 900;
const FORM_MAX_WIDTH = 420;

const PUNTOS = [
  { icon: 'lock-closed-outline', text: 'Solo tu grupo familiar ve los datos' },
  { icon: 'ban-outline', text: 'Sin publicidad ni venta de información' },
  { icon: 'text-outline', text: 'Letra grande y clara, pensada para todos' },
];

// Registro: una sola tarjeta más grande con un adelanto de lo que hay adentro (en vez de los
// puntos de privacidad, que ya vio quien llegó hasta acá). Datos de ejemplo, no reales.
const AVISOS = [
  { cuando: 'Hoy 18:00', que: 'Enalapril — Marta', icon: 'medkit-outline', bg: '#FBE3D9', fg: '#C24623' },
  { cuando: 'Mañana 10:00', que: 'Vacuna de Toby', icon: 'paw', bg: '#D6E2D6', fg: '#3E6340' },
];

function ResumenFamilia() {
  return (
    <View {...paper('cutout', 'pop', 'd1')} style={styles.resumen} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.resumenHead}>
        <View style={styles.resumenAvatar}>
          <Ionicons name="people" size={24} color="#3E6340" />
        </View>
        <View>
          <Text style={styles.resumenTitle}>Familia García</Text>
          <Text style={styles.resumenSub}>4 integrantes · 1 mascota</Text>
        </View>
      </View>
      <View style={styles.avisos}>
        {AVISOS.map((a) => (
          <View key={a.que} style={styles.aviso}>
            <View style={[styles.avisoIcon, { backgroundColor: a.bg }]}>
              <Ionicons name={a.icon} size={20} color={a.fg} />
            </View>
            <View style={styles.avisoTexto}>
              <Text style={styles.avisoCuando}>{a.cuando}</Text>
              <Text style={styles.avisoQue}>{a.que}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function CambioDePantalla({ texto, etiqueta, onPress }) {
  return (
    <View style={styles.cambio}>
      <Text style={styles.cambioText}>{texto}</Text>
      <PressScale contentStyle={styles.cambioBtn} onPress={onPress} accessibilityLabel={etiqueta}>
        <Text style={styles.cambioLink}>{etiqueta}</Text>
      </PressScale>
    </View>
  );
}

function Volver({ onPress }) {
  return (
    <PressScale contentStyle={styles.backBtn} onPress={onPress} accessibilityLabel="Volver">
      <Ionicons name="arrow-back" size={22} color={colors.ink} />
      <Text style={styles.backText}>Volver</Text>
    </PressScale>
  );
}

export default function AuthLayout({
  onBack,
  switchTexto,
  switchEtiqueta,
  onSwitch,
  panelTitulo,
  panelVariante = 'login',
  children,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const formulario = (
    <ScrollView
      style={styles.formScroll}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.column}>
        {!isDesktop && (
          <View style={styles.logoMovil}>
            <LogoConNombre variante="terracota" size={34} fontSize={22} />
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {isDesktop ? (
        <View style={styles.split}>
          {/* Panel cálido, inset con 16px de margen */}
          <View style={styles.panel}>
            <View style={styles.marcaAgua} pointerEvents="none">
              <Logo variante="terracota" size={360} />
            </View>

            <View style={styles.panelTop}>
              <Volver onPress={onBack} />
              <LogoConNombre variante="terracota" size={36} fontSize={22} />
            </View>

            <View style={styles.panelCentro}>
              <Text style={styles.panelTitle} accessibilityRole="header">{panelTitulo}</Text>
              {panelVariante === 'registro' ? (
                <ResumenFamilia />
              ) : (
                <>
                  <View style={styles.puntos}>
                    {PUNTOS.map((p) => (
                      <View key={p.text} style={styles.punto}>
                        <View style={styles.puntoIcon}>
                          <Ionicons name={p.icon} size={22} color={colors.accentStrong} />
                        </View>
                        <Text style={styles.puntoText}>{p.text}</Text>
                      </View>
                    ))}
                  </View>

                  {/* El producto, apenas inclinado */}
                  <View {...paper('cutout', 'pop', 'd1')} style={styles.miniCard} accessibilityElementsHidden importantForAccessibility="no">
                    <View style={styles.miniIcon}>
                      <Ionicons name="paw" size={20} color="#3E6340" />
                    </View>
                    <View>
                      <Text style={styles.miniTitle}>Familia García · 4 integrantes</Text>
                      <Text style={styles.miniSub}>Próximo aviso: Vacuna de Toby</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            <Text style={styles.panelPie}>Proyecto de Prácticas Profesionalizantes II · IES Santa Fe</Text>
          </View>

          {/* Mitad derecha en blanco, formulario directo */}
          <View style={styles.derecha}>
            <View style={styles.derechaTop}>
              <CambioDePantalla texto={switchTexto} etiqueta={switchEtiqueta} onPress={onSwitch} />
            </View>
            {formulario}
          </View>
        </View>
      ) : (
        <View style={styles.movil}>
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Volver onPress={onBack} />
            <CambioDePantalla texto="" etiqueta={switchEtiqueta} onPress={onSwitch} />
          </View>
          {formulario}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  split: { flex: 1, flexDirection: 'row' },
  movil: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 64 },

  // ---- panel izquierdo
  panel: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    backgroundColor: BANDA,
    overflow: 'hidden',
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  marcaAgua: { position: 'absolute', right: -90, bottom: -80, opacity: 0.04 },
  panelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelCentro: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 28 },
  // Un escalón por debajo del título del formulario: el panel acompaña, no compite.
  panelTitle: { fontSize: 32, lineHeight: 42, fontFamily: SERIF_BOLD, color: colors.ink },
  puntos: { gap: 8 },
  punto: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 52 },
  puntoIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  puntoText: { flex: 1, fontSize: 18, lineHeight: 26, color: colors.ink },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
    padding: 16,
    paddingRight: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    // Tarjeta física apoyada: borde blanco, sombra cálida (en web, de dos capas vía theme/paper.js),
    // sin giro — tiene texto que hay que poder leer.
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  resumen: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 28,
    elevation: 3,
    gap: 16,
  },
  resumenHead: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  resumenAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D6E2D6', alignItems: 'center', justifyContent: 'center' },
  resumenTitle: { fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink },
  resumenSub: { fontSize: 15, lineHeight: 22, color: '#3F3631' },
  avisos: { gap: 12 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, backgroundColor: '#FAF5EF' },
  avisoIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avisoTexto: { flex: 1 },
  avisoCuando: { fontSize: 14, lineHeight: 20, color: '#574E49', fontFamily: poppinsWeight('600') },
  avisoQue: { fontSize: 16, lineHeight: 22, color: colors.ink },
  miniIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D6E2D6', alignItems: 'center', justifyContent: 'center' },
  miniTitle: { fontSize: 15, lineHeight: 22, fontFamily: poppinsWeight('700'), color: colors.ink },
  miniSub: { fontSize: 14, lineHeight: 20, color: '#3F3631' },
  panelPie: { fontSize: 14, lineHeight: 20, color: '#574E49' },

  // ---- mitad derecha
  // El cambio de pantalla flota arriba (absoluto) para que el formulario quede centrado
  // de verdad en la columna, a la misma altura que el contenido del panel.
  derecha: { flex: 1, backgroundColor: '#FFFFFF' },
  derechaTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, alignItems: 'flex-end', paddingHorizontal: 32, paddingTop: 16 },
  formScroll: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  column: { width: '100%', maxWidth: FORM_MAX_WIDTH, alignSelf: 'center' },
  logoMovil: { marginBottom: 20 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingRight: 16 },
  backText: { fontSize: 17, fontFamily: poppinsWeight('600'), color: colors.ink },
  cambio: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cambioText: { fontSize: 16, color: colors.textBody },
  cambioBtn: { minHeight: 48, paddingHorizontal: 8, justifyContent: 'center' },
  cambioLink: { fontSize: 16, color: colors.accentStrong, fontFamily: poppinsWeight('600'), textDecorationLine: 'underline' },
});
