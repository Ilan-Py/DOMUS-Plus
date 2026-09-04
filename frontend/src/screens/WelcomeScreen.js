import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Circle, Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { SPACING } from '../theme/spacing';
import { poppinsWeight } from '../theme/typography';
import BackgroundBlobs from '../components/BackgroundBlobs';
import PrimaryButton from '../components/PrimaryButton';

const HORIZONTAL_INSET = 28;
const HERO_HEIGHT_RATIO = 0.36; // zona del hero ≈ 36% del alto del safe-area content

// Primera implementación en código del concepto "gato + perro sentados sobre
// un blob" aprobado antes por separado (Visualizer) — no existía como
// componente todavía. Recoloreado para la paleta hogareño actual: el perro
// ya no es el gold/tan de la paleta vieja, ahora usa avatarAdultText
// (#8A5A20, dorado/café profundo) en vez de avatarAdultBg — ese último es el
// tono PÁLIDO de fondo pensado para ir DETRÁS de un ícono (ver AVATAR_TINTS
// en FamilyListScreen), no un color con saturación suficiente para leerse
// como el pelaje de un animal sobre el crema de fondo; avatarAdultText es el
// miembro saturado de esa misma familia, y ya significa "adulto/cálido" en
// el resto de la app. El gato se mantiene ink (casi negro), como en el
// concepto original. Formas hechas a mano (círculos/elipses/curvas simples,
// no un trace real) — mismo criterio que BLOB_PATH en RadialFab: no hay forma
// de verificar el resultado exacto sin renderizar en dispositivo/simulador.
//
// Rediseño a línea (line art): los animales pasan de fill sólido a stroke —
// dos blobs grandes y oscuros competían visualmente con el headline debajo;
// el blob de asiento se mantiene fill sólido (es fondo, no protagonista).
// Ojos siguen siendo círculos rellenos (no cutouts) porque un cutout sólo
// "corta" contra un fill sólido detrás — contra líneas no hay nada que cortar.
const STROKE_WIDTH = 2.5;
const dogStroke = {
  fill: 'none',
  stroke: colors.avatarAdultText,
  strokeWidth: STROKE_WIDTH,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};
const catStroke = {
  fill: 'none',
  stroke: colors.ink,
  strokeWidth: STROKE_WIDTH,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function PetHeroIllustration({ size = 260 }) {
  return (
    <Svg width={size} height={size * 0.78} viewBox="0 0 260 200">
      {/* Blob de asiento — mismo lenguaje de forma orgánica que el resto de
          la app (RadialFab), en el tinte salvia claro. Único fill sólido:
          es el fondo de la composición, no el sujeto. */}
      <Path
        d="M40,150 C10,140 -4,110 14,84 C30,60 62,58 92,50 C130,40 178,36 206,58
           C236,82 244,120 218,146 C190,174 140,168 100,170 C74,172 60,158 40,150 Z"
        fill={colors.sage}
      />

      {/* Perro — cuerpo, cabeza, orejas, cola. */}
      <Ellipse cx="98" cy="150" rx="40" ry="34" {...dogStroke} />
      <Circle cx="96" cy="96" r="32" {...dogStroke} />
      <Ellipse cx="70" cy="72" rx="12" ry="18" rotation={-25} origin="70,72" {...dogStroke} />
      <Ellipse cx="122" cy="72" rx="12" ry="18" rotation={25} origin="122,72" {...dogStroke} />
      <Path
        d="M136,138 C154,132 164,116 158,102 C154,124 144,132 132,134 Z"
        {...dogStroke}
      />
      <Circle cx="86" cy="92" r="4" fill={colors.avatarAdultText} />
      <Circle cx="106" cy="92" r="4" fill={colors.avatarAdultText} />
      <Ellipse cx="96" cy="104" rx="6" ry="4" fill={colors.avatarAdultText} />

      {/* Gato — apoyado contra el perro, mismo lenguaje de formas. */}
      <Ellipse cx="176" cy="152" rx="30" ry="36" {...catStroke} />
      <Circle cx="180" cy="100" r="26" {...catStroke} />
      <Path d="M160,84 L166,62 L176,86 Z" {...catStroke} />
      <Path d="M200,84 L196,60 L186,86 Z" {...catStroke} />
      <Path
        d="M204,148 C222,144 232,126 224,110 C224,130 214,140 200,144 Z"
        {...catStroke}
      />
      <Circle cx="172" cy="100" r="3.5" fill={colors.ink} />
      <Circle cx="190" cy="100" r="3.5" fill={colors.ink} />
    </Svg>
  );
}

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
          <PetHeroIllustration />
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
