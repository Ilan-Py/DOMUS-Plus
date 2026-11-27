import React from 'react';
import { Platform } from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';
import { colors } from '../theme/colors';

// Casita de papel recortado para la cabecera de "Grupo familiar": techo terracota, planta verde
// salvia, borde blanco de 4 px y sombra cálida. Decorativa y estática. viewBox 100×100.
const BORDE = { fill: '#FFFFFF', stroke: '#FFFFFF', strokeWidth: 8, strokeLinejoin: 'round', strokeLinecap: 'round' };
const SOMBRA = Platform.select({
  web: { filter: 'drop-shadow(0 1px 1px rgba(42, 36, 33, 0.14)) drop-shadow(0 5px 8px rgba(42, 36, 33, 0.10))' },
  default: {},
});
const HOJA = 'M0 0 C-8 -4 -8 -17 0 -25 C8 -17 8 -4 0 0Z';

export default function CasaRecorte({ size = 96 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={SOMBRA} accessibilityElementsHidden importantForAccessibility="no">
      {['borde', 'color'].map((capa) => {
        const b = capa === 'borde';
        return (
          <G key={capa}>
            <Rect x={18} y={48} width={52} height={42} rx={5} {...(b ? BORDE : { fill: colors.terracotaSoft })} />
            <Path d="M10 52 L44 20 L78 52 Z" {...(b ? BORDE : { fill: colors.accentStrong })} />
            {b ? (
              <Path d="M86 92 Q90 74 84 54" stroke="#FFFFFF" strokeWidth={12} strokeLinecap="round" fill="none" />
            ) : (
              <Path d="M86 92 Q90 74 84 54" stroke={colors.salvia} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            )}
            <G transform="translate(87 80) rotate(58)"><Path d={HOJA} {...(b ? BORDE : { fill: colors.salvia })} /></G>
            <G transform="translate(86 68) rotate(-54)"><Path d={HOJA} {...(b ? BORDE : { fill: colors.salvia })} /></G>
            <G transform="translate(84 56) rotate(6)"><Path d={HOJA} {...(b ? BORDE : { fill: colors.salvia })} /></G>
          </G>
        );
      })}
      <Rect x={37} y={64} width={16} height={26} rx={8} fill={colors.ocre} />
      <Rect x={24} y={58} width={10} height={10} rx={2.5} fill={colors.salviaSoft} />
      <Rect x={56} y={58} width={10} height={10} rx={2.5} fill={colors.salviaSoft} />
    </Svg>
  );
}
