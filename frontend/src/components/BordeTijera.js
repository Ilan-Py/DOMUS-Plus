import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Borde «cortado a tijera»: una franja con el canto irregular, como papel cortado a mano. Se pone pegada abajo (o
// arriba) de una superficie del mismo color para que esa superficie parezca recortada. Es SVG, así que se ve igual en
// web y en el celular (el clip-path de CSS no existe en nativo).
//
// El dibujo es determinístico (sale de `semilla`): no cambia en cada render ni entre dispositivos.
//   <BordeTijera color={color.arena} alto={10} />
function ruido(i, semilla) {
  const x = Math.sin(i * 12.9898 + semilla * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function caminoTijera({ tramos = 28, semilla = 3, lado = 'abajo' } = {}) {
  // viewBox 100 × 10. El papel ocupa de y=0 hasta el canto, que va entre 2 y 9.
  const puntos = [];
  for (let i = 0; i <= tramos; i += 1) {
    const x = (i / tramos) * 100;
    const y = 2 + ruido(i, semilla) * 7;
    puntos.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  const canto = puntos.join(' L ');
  return lado === 'abajo' ? `M 0 0 L ${canto} L 100 0 Z` : `M 0 10 L ${canto} L 100 10 Z`;
}

export default function BordeTijera({ color, alto = 10, semilla = 3, tramos = 28, lado = 'abajo', style }) {
  const d = useMemo(() => caminoTijera({ tramos, semilla, lado }), [tramos, semilla, lado]);
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[estilos.franja, { height: alto }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 10" preserveAspectRatio="none">
        <Path d={d} fill={color} />
      </Svg>
    </View>
  );
}

const estilos = StyleSheet.create({
  franja: { width: '100%' },
});
