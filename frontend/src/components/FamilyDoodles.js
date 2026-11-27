import React from 'react';
import Svg, { Path, Circle, Ellipse, G, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

// Ilustraciones de la portada de Familia, dibujadas a mano con react-native-svg
// (sirven igual en web y en móvil). Mismo lenguaje que la ilustración del
// onboarding: curvas suaves, rellenos pastel planos y un detalle de línea fina
// encima, con puntas redondeadas.
//
// Paleta exclusiva de estas piezas:
//   terracota #C84B28 · durazno #E89B72 · salvia #7D9B76 · ocre miel #E6B86A
//   arena #EADFD5 · marrón cálido #5C4A3E
const TERRACOTA = '#C84B28';
const DURAZNO = '#E89B72';
const SALVIA = '#7D9B76';
const OCRE = '#E6B86A';
const ARENA = '#EADFD5';
const MARRON = '#5C4A3E';

const LINEA = { strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };

// Destello de cuatro puntas, centrado en (0,0).
const DESTELLO = 'M0 -6 Q0.8 -0.8 6 0 Q0.8 0.8 0 6 Q-0.8 0.8 -6 0 Q-0.8 -0.8 0 -6Z';

// Hoja redondeada: base en (0,0), punta hacia arriba.
const HOJA = 'M0 0 C-7 -4 -7 -15 0 -22 C7 -15 7 -4 0 0Z';

function Hoja({ x, y, giro = 0, escala = 1, relleno = SALVIA, opacidad = 0.55 }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}>
      <Path d={HOJA} fill={relleno} fillOpacity={opacidad} />
      <Path d="M0 -2 V-17" stroke={SALVIA} strokeOpacity={0.75} {...LINEA} />
    </G>
  );
}

function Destello({ x, y, escala = 1, color = OCRE, opacidad = 0.8 }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${escala})`}>
      <Path d={DESTELLO} fill={color} fillOpacity={opacidad} />
    </G>
  );
}

// Escena del banner: casita con techo curvo y corazón, dos ramas con hojas,
// arcoíris de tres trazos, una patita y destellos. viewBox 260×130.
export function BannerDoodle({ width = 260 }) {
  const height = (width * 130) / 260;
  return (
    <Svg width={width} height={height} viewBox="0 0 260 130" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      {/* Arcoíris: tres trazos que nacen de la izquierda */}
      <Path d="M14 118 A46 46 0 0 1 106 118" stroke={TERRACOTA} strokeOpacity={0.6} {...LINEA} strokeWidth={3.5} />
      <Path d="M24 118 A36 36 0 0 1 96 118" stroke={DURAZNO} strokeOpacity={0.75} {...LINEA} strokeWidth={3.5} />
      <Path d="M34 118 A26 26 0 0 1 86 118" stroke={OCRE} strokeOpacity={0.85} {...LINEA} strokeWidth={3.5} />

      {/* Patita sutil, arriba del arcoíris */}
      <G opacity={0.5}>
        <Path d="M54 58 C48 58 44 63 46 68 C47 72 52 73 54 73 C56 73 61 72 62 68 C64 63 60 58 54 58Z" fill={MARRON} fillOpacity={0.55} />
        <Ellipse cx={44} cy={53} rx={3.2} ry={4} fill={MARRON} fillOpacity={0.55} transform="rotate(-20 44 53)" />
        <Ellipse cx={51} cy={47} rx={3.2} ry={4.2} fill={MARRON} fillOpacity={0.55} transform="rotate(-6 51 47)" />
        <Ellipse cx={59} cy={47} rx={3.2} ry={4.2} fill={MARRON} fillOpacity={0.55} transform="rotate(6 59 47)" />
        <Ellipse cx={66} cy={53} rx={3.2} ry={4} fill={MARRON} fillOpacity={0.55} transform="rotate(20 66 53)" />
      </G>

      {/* Casita: cuerpo pastel, techo curvo, puerta, ventana, chimenea y corazón */}
      <Path
        d="M124 62 V110 Q124 114 128 114 H178 Q182 114 182 110 V62"
        fill={DURAZNO}
        fillOpacity={0.42}
      />
      <Path
        d="M112 66 Q153 18 194 66 Q153 50 112 66Z"
        fill={TERRACOTA}
        fillOpacity={0.5}
      />
      <Path d="M112 66 Q153 18 194 66" stroke={TERRACOTA} strokeOpacity={0.85} {...LINEA} />
      <Path d="M124 62 V110 Q124 114 128 114 H178 Q182 114 182 110 V62" stroke={MARRON} strokeOpacity={0.6} {...LINEA} />
      <Path d="M143 114 V92 Q143 85 153 85 Q163 85 163 92 V114" fill={TERRACOTA} fillOpacity={0.35} stroke={TERRACOTA} strokeOpacity={0.8} {...LINEA} />
      <Circle cx={159} cy={100} r={1.6} fill={MARRON} fillOpacity={0.7} />
      <Path d="M130 78 H140 V88 H130Z" fill={ARENA} fillOpacity={0.9} stroke={MARRON} strokeOpacity={0.5} {...LINEA} strokeWidth={1.5} />
      <Path d="M135 78 V88 M130 83 H140" stroke={MARRON} strokeOpacity={0.4} {...LINEA} strokeWidth={1.25} />
      <Path d="M170 38 V24 Q170 21 173 21 Q176 21 176 24 V47" stroke={MARRON} strokeOpacity={0.55} {...LINEA} />
      <Path d="M173 14 Q170 9 175 6 Q171 12 177 12" stroke={ARENA} {...LINEA} strokeWidth={1.5} />
      <Path
        d="M153 52 C150.5 47.5 143.5 49 145.5 54 C146.8 57.4 153 61 153 61 C153 61 159.2 57.4 160.5 54 C162.5 49 155.5 47.5 153 52Z"
        fill={TERRACOTA}
        fillOpacity={0.75}
      />

      {/* Ramas botánicas a la derecha */}
      <Path d="M226 122 Q236 86 216 48" stroke={SALVIA} strokeOpacity={0.8} {...LINEA} />
      <Hoja x={231} y={104} giro={62} />
      <Hoja x={233} y={88} giro={-52} escala={0.9} relleno={SALVIA} opacidad={0.45} />
      <Hoja x={226} y={72} giro={58} escala={0.85} />
      <Hoja x={218} y={58} giro={-48} escala={0.8} opacidad={0.4} />
      <Hoja x={215} y={46} giro={12} escala={0.7} />
      <Path d="M204 124 Q209 102 198 82" stroke={SALVIA} strokeOpacity={0.7} {...LINEA} />
      <Hoja x={205} y={108} giro={-58} escala={0.8} opacidad={0.45} />
      <Hoja x={203} y={94} giro={56} escala={0.75} />
      <Hoja x={198} y={81} giro={-8} escala={0.65} opacidad={0.4} />

      {/* Destellos */}
      <Destello x={104} y={34} escala={1.1} />
      <Destello x={246} y={34} escala={0.8} color={DURAZNO} />
      <Destello x={196} y={18} escala={0.65} color={TERRACOTA} opacidad={0.55} />
    </Svg>
  );
}

// Estado «sin pendientes»: sol sonriente entre hojitas, con un círculo de check
// integrado en la composición y tres destellos. viewBox 120×96.
export function AllClearDoodle({ width = 120 }) {
  const height = (width * 96) / 120;
  const rayos = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return { x1: 60 + Math.cos(a) * 26, y1: 42 + Math.sin(a) * 26, x2: 60 + Math.cos(a) * 33, y2: 42 + Math.sin(a) * 33 };
  });
  return (
    <Svg width={width} height={height} viewBox="0 0 120 96" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      {/* Rayos */}
      {rayos.map((r, i) => (
        <Path
          key={i}
          d={`M${r.x1.toFixed(1)} ${r.y1.toFixed(1)} L${r.x2.toFixed(1)} ${r.y2.toFixed(1)}`}
          stroke={i % 2 === 0 ? OCRE : DURAZNO}
          strokeOpacity={0.9}
          {...LINEA}
          strokeWidth={2.25}
        />
      ))}
      {/* Sol */}
      <Circle cx={60} cy={42} r={20} fill={OCRE} fillOpacity={0.55} />
      <Circle cx={60} cy={42} r={20} stroke={OCRE} {...LINEA} />
      <Circle cx={53} cy={39} r={1.9} fill={MARRON} fillOpacity={0.8} />
      <Circle cx={67} cy={39} r={1.9} fill={MARRON} fillOpacity={0.8} />
      <Path d="M52 47 Q60 55 68 47" stroke={MARRON} strokeOpacity={0.8} {...LINEA} />
      <Ellipse cx={49} cy={46} rx={3.4} ry={2.2} fill={TERRACOTA} fillOpacity={0.22} />
      <Ellipse cx={71} cy={46} rx={3.4} ry={2.2} fill={TERRACOTA} fillOpacity={0.22} />

      {/* Hojitas de salvia abajo */}
      <Path d="M30 90 Q36 78 28 66" stroke={SALVIA} strokeOpacity={0.8} {...LINEA} />
      <Hoja x={31} y={80} giro={58} escala={0.8} />
      <Hoja x={30} y={70} giro={-50} escala={0.7} opacidad={0.45} />
      <Hoja x={28} y={64} giro={6} escala={0.62} />
      <Path d="M92 90 Q86 80 94 70" stroke={SALVIA} strokeOpacity={0.7} {...LINEA} />
      <Hoja x={90} y={82} giro={-56} escala={0.75} opacidad={0.45} />
      <Hoja x={92} y={73} giro={52} escala={0.65} />

      {/* Check integrado */}
      <Circle cx={90} cy={64} r={10} fill={SALVIA} fillOpacity={0.9} />
      <Path d="M85 64.5 L88.7 68.3 L95.5 60.5" stroke="#FFFFFF" {...LINEA} strokeWidth={2.25} />

      {/* Destellos */}
      <Destello x={20} y={30} escala={0.9} />
      <Destello x={104} y={22} escala={0.75} color={DURAZNO} />
      <Destello x={14} y={56} escala={0.55} color={TERRACOTA} opacidad={0.55} />
    </Svg>
  );
}

// Mini doodles para estados vacíos (48–64px): tenues, para que la tarjeta no
// quede como un rectángulo con una sola línea gris. Mismo estilo y paleta.
export function EmptyDoodle({ variant = 'hojas', size = 56 }) {
  const lineas = { strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      {variant === 'documento' && (
        <>
          <Path d="M16 10 H38 L48 20 V52 Q48 54 46 54 H18 Q16 54 16 52Z" fill={ARENA} fillOpacity={0.7} />
          <Path d="M16 10 H38 L48 20 V52 Q48 54 46 54 H18 Q16 54 16 52Z" stroke={MARRON} strokeOpacity={0.55} {...lineas} />
          <Path d="M38 10 V20 H48" stroke={MARRON} strokeOpacity={0.45} {...lineas} />
          <Path d="M23 30 H41 M23 37 H41 M23 44 H34" stroke={DURAZNO} strokeOpacity={0.85} {...lineas} />
          <G transform="translate(50 52) rotate(24)">
            <Path d={HOJA} fill={SALVIA} fillOpacity={0.55} transform="scale(0.8)" />
          </G>
        </>
      )}
      {variant === 'calendario' && (
        <>
          <Rect x={11} y={14} width={42} height={38} rx={7} fill={OCRE} fillOpacity={0.3} />
          <Rect x={11} y={14} width={42} height={38} rx={7} stroke={MARRON} strokeOpacity={0.55} {...lineas} />
          <Path d="M11 26 H53" stroke={MARRON} strokeOpacity={0.45} {...lineas} />
          <Path d="M22 9 V18 M42 9 V18" stroke={TERRACOTA} strokeOpacity={0.7} {...lineas} />
          <Circle cx={24} cy={36} r={2.4} fill={TERRACOTA} fillOpacity={0.6} />
          <Circle cx={34} cy={36} r={2.4} fill={DURAZNO} fillOpacity={0.8} />
          <Circle cx={44} cy={36} r={2.4} fill={SALVIA} fillOpacity={0.8} />
          <Circle cx={24} cy={44} r={2.4} fill={SALVIA} fillOpacity={0.8} />
        </>
      )}
      {variant === 'hojas' && (
        <>
          <Path d="M32 56 Q34 40 30 24" stroke={SALVIA} strokeOpacity={0.85} {...lineas} />
          <Hoja x={32} y={46} giro={58} escala={0.95} />
          <Hoja x={32} y={38} giro={-54} escala={0.85} opacidad={0.45} />
          <Hoja x={31} y={30} giro={52} escala={0.75} />
          <Hoja x={30} y={24} giro={-8} escala={0.65} opacidad={0.45} />
          <Path d="M20 56 H44" stroke={ARENA} {...lineas} strokeWidth={2.5} />
        </>
      )}
      <Destello x={50} y={14} escala={0.7} />
      <Destello x={13} y={20} escala={0.5} color={DURAZNO} />
    </Svg>
  );
}

// ---- Detalles de la bienvenida ----------------------------------------------------

// Subrayado a mano para una palabra clave del título (trazo orgánico, terracota suave).
export function Subrayado({ color = TERRACOTA, alto = 14 }) {
  return (
    <Svg width="100%" height={alto} viewBox="0 0 260 14" preserveAspectRatio="none" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M3 9 C38 3 72 12 112 7 S190 3 257 8" stroke={color} strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" />
      <Path d="M14 12 C60 8 110 13 170 10" stroke={color} strokeOpacity={0.3} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

// Tres chispas de distinto tamaño.
export function Chispas({ size = 44 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      <G transform="translate(24 16)">
        <Path d={DESTELLO} fill={OCRE} fillOpacity={0.9} transform="scale(1.7)" />
      </G>
      <G transform="translate(9 28)">
        <Path d={DESTELLO} fill={TERRACOTA} fillOpacity={0.6} transform="scale(1)" />
      </G>
      <G transform="translate(36 34)">
        <Path d={DESTELLO} fill={DURAZNO} fillOpacity={0.85} transform="scale(0.8)" />
      </G>
    </Svg>
  );
}

// Flechita curva a mano, para señalar una tarjeta.
export function FlechaCurva({ size = 56, color = MARRON, opacidad = 0.55 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M6 10 C10 34 30 46 48 40" stroke={color} strokeOpacity={opacidad} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M39 32 L49 40 L38 47" stroke={color} strokeOpacity={opacidad} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
