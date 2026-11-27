import React from 'react';
import { Platform } from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { colors } from '../theme/colors';

// Ilustración del banner de Familia hecha de recortes de papel en capas: arcoíris, casita y plantas
// con la paleta de DOMUS+ (terracota, ocre, salvia), borde blanco de 4 px y sombra cálida suave.
// Cada pieza se dibuja dos veces: primero una silueta blanca con trazo grueso (el corte) y encima
// el color. Es decorativa y estática (sin animación). viewBox 300×150.
const BORDE = { fill: '#FFFFFF', stroke: '#FFFFFF', strokeWidth: 8, strokeLinejoin: 'round', strokeLinecap: 'round' };

const SOMBRA = Platform.select({
  web: { filter: 'drop-shadow(0 1px 1px rgba(42, 36, 33, 0.14)) drop-shadow(0 6px 10px rgba(42, 36, 33, 0.10))' },
  default: {},
});

// Hoja con la base en (0,0) y la punta hacia arriba.
const HOJA = 'M0 0 C-9 -5 -9 -19 0 -28 C9 -19 9 -5 0 0Z';

function Hoja({ x, y, giro, escala = 1, relleno, capa }) {
  const props = capa === 'borde' ? BORDE : { fill: relleno };
  return (
    <G transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}>
      <Path d={HOJA} {...props} />
    </G>
  );
}

function Planta({ x, alto, capa, hojas }) {
  const tallo = `M${x} 146 Q${x + 8} ${146 - alto / 2} ${x - 2} ${146 - alto}`;
  return (
    <G>
      {capa === 'borde' ? (
        <Path d={tallo} stroke="#FFFFFF" strokeWidth={12} strokeLinecap="round" fill="none" />
      ) : (
        <Path d={tallo} stroke={colors.salvia} strokeWidth={4} strokeLinecap="round" fill="none" />
      )}
      {hojas.map((h, i) => (
        <Hoja key={i} capa={capa} x={x + h.dx} y={146 - h.dy} giro={h.giro} escala={h.escala} relleno={h.relleno} />
      ))}
    </G>
  );
}

export default function BannerRecortes({ width = 300 }) {
  const height = (width * 150) / 300;
  const capas = ['borde', 'color'];
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 300 150"
      style={SOMBRA}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {/* Arcoíris: una banda blanca de corte y tres franjas de color pegadas */}
      <Path d="M39 146 A37 37 0 0 1 113 146" stroke="#FFFFFF" strokeWidth={47} strokeLinecap="round" fill="none" />
      <Path d="M26 146 A50 50 0 0 1 126 146" stroke={colors.accentStrong} strokeWidth={13} fill="none" />
      <Path d="M39 146 A37 37 0 0 1 113 146" stroke={colors.ocre} strokeWidth={13} fill="none" />
      <Path d="M52 146 A24 24 0 0 1 100 146" stroke={colors.salvia} strokeWidth={13} fill="none" />

      {/* Casita */}
      {capas.map((capa) => {
        const cuerpo = capa === 'borde' ? BORDE : { fill: colors.terracotaSoft };
        const techo = capa === 'borde' ? BORDE : { fill: colors.accentStrong };
        return (
          <G key={capa}>
            <Rect x={150} y={78} width={72} height={64} rx={6} {...cuerpo} />
            <Path d="M142 82 L186 36 L230 82 Z" {...techo} />
          </G>
        );
      })}
      <Rect x={176} y={104} width={20} height={38} rx={10} fill={colors.ocre} />
      <Rect x={158} y={90} width={14} height={14} rx={3} fill={colors.salviaSoft} />
      <Rect x={200} y={90} width={14} height={14} rx={3} fill={colors.salviaSoft} />
      <Circle cx={186} cy={62} r={7} fill={colors.ocreSoft} />
      <Path d="M186 66 L183 62.5 Q182 60.6 184 60 Q185.4 59.7 186 61 Q186.6 59.7 188 60 Q190 60.6 189 62.5 Z" fill={colors.accentStrong} />

      {/* Plantas */}
      {capas.map((capa) => (
        <G key={capa}>
          <Planta
            x={252}
            alto={92}
            capa={capa}
            hojas={[
              { dx: 3, dy: 28, giro: 62, escala: 0.95, relleno: colors.salvia },
              { dx: 2, dy: 48, giro: -58, escala: 0.9, relleno: colors.ocre },
              { dx: 1, dy: 68, giro: 56, escala: 0.85, relleno: colors.salvia },
              { dx: -2, dy: 90, giro: 6, escala: 0.8, relleno: colors.salvia },
            ]}
          />
          <Planta
            x={276}
            alto={60}
            capa={capa}
            hojas={[
              { dx: 3, dy: 20, giro: -60, escala: 0.8, relleno: colors.salvia },
              { dx: 2, dy: 38, giro: 54, escala: 0.75, relleno: colors.ocre },
              { dx: -1, dy: 58, giro: 4, escala: 0.7, relleno: colors.salvia },
            ]}
          />
        </G>
      ))}
    </Svg>
  );
}
