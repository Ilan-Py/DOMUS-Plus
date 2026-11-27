import React, { useEffect, useRef } from 'react';
import { View, Animated, Platform } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect } from 'react-native-svg';
import useReducedMotion from '../hooks/useReducedMotion';
import { paper, demora } from '../theme/paper';

// Sticker de papel: figura SVG minimalista con borde blanco grueso (corte tipo sticker) y sombra
// cálida en dos capas. Es un acento puntual (estados vacíos, 404, hero), no un control.
// Entrada única "paper-pop" (CSS en web, spring en nativo); con "reducir movimiento" aparece directo.
// `icon` acepta los nombres de siempre: heart, paw, calendar, notifications, people, help.
export const TINTES_RECORTE = {
  terracota: { bg: '#FBE3D9', fg: '#C24623' },
  salvia: { bg: '#D6E2D6', fg: '#3E6340' },
  arena: { bg: '#F6E7C1', fg: '#8A6A12' },
};

// Cada forma se dibuja dos veces sobre una grilla 100×100: la capa 'borde' (blanca, con trazo
// grueso redondeado = el corte del sticker) y la capa 'color'. `d` son los detalles internos.
const FORMAS = {
  heart: ({ c }) => (
    <Path
      d="M50 87 C21 65 10 47 10 33 C10 21 19 13 30 13 C38 13 45 17 50 25 C55 17 62 13 70 13 C81 13 90 21 90 33 C90 47 79 65 50 87 Z"
      {...c}
    />
  ),
  paw: ({ c }) => (
    <>
      <Path d="M50 50 C36 50 23 63 26 76 C28 87 40 87 50 82 C60 87 72 87 74 76 C77 63 64 50 50 50 Z" {...c} />
      <Ellipse cx="21" cy="45" rx="9" ry="12" {...c} />
      <Ellipse cx="39" cy="25" rx="9" ry="13" {...c} />
      <Ellipse cx="61" cy="25" rx="9" ry="13" {...c} />
      <Ellipse cx="79" cy="45" rx="9" ry="12" {...c} />
    </>
  ),
  calendar: ({ c, d }) => (
    <>
      <Rect x="12" y="20" width="76" height="68" rx="12" {...c} />
      <Rect x="28" y="9" width="10" height="22" rx="5" {...c} />
      <Rect x="62" y="9" width="10" height="22" rx="5" {...c} />
      {d && (
        <>
          <Rect x="12" y="40" width="76" height="3" fill={d} />
          <Circle cx="30" cy="58" r="4.5" fill={d} />
          <Circle cx="50" cy="58" r="4.5" fill={d} />
          <Circle cx="70" cy="58" r="4.5" fill={d} />
          <Circle cx="30" cy="74" r="4.5" fill={d} />
          <Circle cx="50" cy="74" r="4.5" fill={d} />
        </>
      )}
    </>
  ),
  notifications: ({ c }) => (
    <>
      <Path d="M50 12 C34 12 26 26 26 42 L26 58 L15 71 L85 71 L74 58 L74 42 C74 26 66 12 50 12 Z" {...c} />
      <Circle cx="50" cy="82" r="8" {...c} />
    </>
  ),
  people: ({ c }) => (
    <>
      <Circle cx="35" cy="32" r="14" {...c} />
      <Circle cx="68" cy="40" r="11" {...c} />
      <Path d="M9 86 C9 64 21 54 35 54 C49 54 61 64 61 86 Z" {...c} />
      <Path d="M52 86 C52 68 60 59 70 59 C82 59 91 68 91 86 Z" {...c} />
    </>
  ),
  help: ({ c, d }) => (
    <>
      <Rect x="22" y="9" width="56" height="82" rx="12" {...c} />
      {d && (
        <>
          <Path
            d="M38 38 C38 26 62 26 62 40 C62 50 50 51 50 61"
            stroke={d}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx="50" cy="75" r="5" fill={d} />
        </>
      )}
    </>
  ),
};

const SOMBRA_WEB = Platform.select({
  web: { filter: 'drop-shadow(0 1px 1px rgba(42, 36, 33, 0.14)) drop-shadow(0 6px 8px rgba(42, 36, 33, 0.1))' },
  default: {},
});

export default function PaperCutout({ icon, tinte = 'terracota', size = 84, rotate = 0, delay = 0, style }) {
  const reduceMotion = useReducedMotion();
  const esWeb = Platform.OS === 'web';
  const anim = useRef(new Animated.Value(esWeb || reduceMotion ? 1 : 0)).current;
  const { bg, fg } = TINTES_RECORTE[tinte] || TINTES_RECORTE.terracota;
  const Forma = FORMAS[icon] || FORMAS.heart;

  // Nativo: mismo "pop" corto con spring (en web lo hace el CSS global).
  useEffect(() => {
    if (esWeb) return;
    if (reduceMotion) {
      anim.setValue(1);
      return;
    }
    Animated.spring(anim, { toValue: 1, delay, bounciness: 8, speed: 14, useNativeDriver: true }).start();
  }, [anim, delay, reduceMotion, esWeb]);

  const escala = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const borde = { fill: '#FFFFFF', stroke: '#FFFFFF', strokeWidth: 16, strokeLinejoin: 'round', strokeLinecap: 'round' };

  return (
    <Animated.View
      {...paper('pop', demora(delay))}
      style={[
        { width: size, height: size, opacity: anim, transform: [{ rotate: `${rotate}deg` }, { scale: escala }] },
        SOMBRA_WEB,
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="-10 -10 120 120">
        <Forma c={borde} d={null} />
        <Forma c={{ fill: fg }} d={bg} />
      </Svg>
    </Animated.View>
  );
}
