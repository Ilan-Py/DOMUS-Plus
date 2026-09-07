import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { SPACING } from '../theme/spacing';
import { poppinsWeight } from '../theme/typography';
import BackgroundBlobs from '../components/BackgroundBlobs';
import PrimaryButton from '../components/PrimaryButton';

const HORIZONTAL_INSET = 28;
const HERO_HEIGHT_RATIO = 0.36; // zona del hero ≈ 36% del alto del safe-area content

// Ilustración real (assets/background.png, 1419×1109 RGBA) — reemplaza al
// line-art SVG hecho a mano que había antes como placeholder. Mismo aspect
// ratio (1.28) que el slot original, así que el tamaño de display no cambió
// mucho, sólo un poco más grande para que se lea el detalle de la escena.
const HERO_WIDTH = 320;
const HERO_HEIGHT = HERO_WIDTH / (1419 / 1109);

// AuthNavigator ahora arranca acá (App.js) — Login/Register siguen intactas,
// sólo cambia cómo se llega a ellas por primera vez.
export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <BackgroundBlobs />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + SPACING.xl, paddingBottom: insets.bottom + SPACING.xl },
        ]}
      >
        <View style={styles.heroWrap}>
          <Image
            source={require('../../assets/background.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.headline}>
            Cuidá a tu familia y a tus mascotas, todo en un solo lugar.
          </Text>
          <Text style={styles.subtext}>
            Vacunas, tratamientos y recordatorios siempre a mano — para las
            personas y los animales que más querés.
          </Text>
        </View>

        <View style={styles.ctaWrap}>
          <PrimaryButton
            title="Crear cuenta"
            variant="accent"
            fullWidth={false}
            onPress={() => navigation.navigate('Register')}
          />
          <PrimaryButton
            title="Iniciar sesión"
            variant="secondary"
            fullWidth={false}
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  content: {
    flex: 1,
    paddingHorizontal: HORIZONTAL_INSET,
    // paddingTop/paddingBottom vienen de insets (ver JSX) — acá sólo la
    // distribución entre las 3 zonas, un solo mecanismo para todo el gap
    // vertical en vez de márgenes fijos por elemento.
    justifyContent: 'space-between',
  },
  heroWrap: {
    height: `${HERO_HEIGHT_RATIO * 100}%`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: HERO_WIDTH,
    height: HERO_HEIGHT,
  },
  textWrap: {
    // sin marginTop — el gap contra heroWrap lo da justify-content:
    // space-between del contenedor padre, no un valor fijo.
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.ink,
  },
  subtext: {
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: SPACING.md,
    maxWidth: 320,
  },
  ctaWrap: {
    gap: SPACING.md,
    // flex-start — sin esto, el stretch default del flex column padre hace
    // que los botones ocupen todo el ancho aun con fullWidth={false} en
    // PrimaryButton (alignSelf:'flex-start' del botón no alcanza si el
    // padre no deja de forzar stretch).
    alignItems: 'flex-start',
    // sin marginTop — space-between ya lo empuja al fondo del safe-area;
    // el padding real de "aire" contra el borde lo da paddingBottom de
    // `content` (insets.bottom + SPACING.xl).
  },
});
