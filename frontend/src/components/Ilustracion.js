import React from 'react';
import { View } from 'react-native';
import Svg, { G, Path, Rect, Circle, Ellipse } from 'react-native-svg';
import { color, hoja } from '../theme/tokens';

// Ilustraciones de papel recortado para estados vacíos y cabeceras. Mismo lenguaje en todas:
//  - 2 a 4 capas planas, sin degradados ni trazos de contorno negros;
//  - cada forma tiene su «sombra de papel»: la misma forma, corrida 3 × 4 px, en arena oscura;
//  - canto blanco de 2,5 px alrededor de las formas principales (el borde del recorte);
//  - paleta del sistema: terracota, salvia, mostaza, rosa, arena, cartulina y tinta (sólo para detalles chicos).
// Son decorativas: el lector de pantalla las saltea (el texto de al lado dice lo mismo).
//
//   <Ilustracion nombre="familia" size={96} />
const SOMBRA = '#E4D6C6';
const CANTO = { stroke: '#FFFFFF', strokeWidth: 2.5, strokeLinejoin: 'round' };

// Dibuja una forma con su sombra de papel debajo.
function Capa({ children }) {
  return (
    <>
      <G transform="translate(3 4)" opacity={1}>
        {React.Children.map(children, (c) => React.cloneElement(c, { fill: SOMBRA, stroke: 'none' }))}
      </G>
      {children}
    </>
  );
}

const DIBUJOS = {
  // Casita con corazón: familia vacía, onboarding.
  familia: (
    <>
      <Capa>
        <Rect x={30} y={56} width={60} height={44} rx={4} fill={color.cartulina} {...CANTO} />
      </Capa>
      <Capa>
        <Path d="M22 60 L60 26 L98 60 Z" fill={color.terracota} {...CANTO} />
      </Capa>
      <Rect x={52} y={74} width={16} height={26} rx={8} fill={color.salvia} />
      <Rect x={36} y={66} width={12} height={12} rx={2} fill={hoja.colores.mostaza} />
      <Path d="M60 12 C56 6 47 8 48 16 C49 21 56 24 60 28 C64 24 71 21 72 16 C73 8 64 6 60 12 Z" fill={color.rosa} {...CANTO} />
    </>
  ),
  // Hoja de calendario con un tilde: calendario vacío.
  calendario: (
    <>
      <Capa>
        <Rect x={22} y={26} width={76} height={74} rx={8} fill={color.cartulina} {...CANTO} />
      </Capa>
      <Rect x={22} y={26} width={76} height={20} rx={8} fill={color.terracota} />
      <Rect x={22} y={38} width={76} height={8} fill={color.terracota} />
      <Rect x={38} y={18} width={6} height={16} rx={3} fill={color.tinta} />
      <Rect x={76} y={18} width={6} height={16} rx={3} fill={color.tinta} />
      {[0, 1, 2].map((f) => [0, 1, 2, 3].map((c) => (
        <Rect key={`${f}-${c}`} x={32 + c * 16} y={54 + f * 14} width={10} height={8} rx={2} fill={f === 1 && c === 2 ? hoja.colores.salvia : '#EFE6DA'} />
      )))}
      <Capa>
        <Circle cx={88} cy={88} r={16} fill={color.salvia} {...CANTO} />
      </Capa>
      <Path d="M80 88 L86 94 L96 82" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Sol con tilde: «hoy no hay nada pendiente».
  aldia: (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((g) => (
        <Rect key={g} x={57} y={14} width={6} height={16} rx={3} fill={hoja.colores.mostaza} transform={`rotate(${g} 60 60)`} />
      ))}
      <Capa>
        <Circle cx={60} cy={60} r={28} fill={color.mostaza} {...CANTO} />
      </Capa>
      <Capa>
        <Circle cx={60} cy={60} r={17} fill={color.salvia} {...CANTO} />
      </Capa>
      <Path d="M52 60 L58 66 L69 54" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Cara de perro: mascotas vacías, PetCard sin foto.
  mascota: (
    <>
      <Capa>
        <Ellipse cx={32} cy={52} rx={14} ry={24} fill={color.salvia} transform="rotate(18 32 52)" {...CANTO} />
      </Capa>
      <Capa>
        <Ellipse cx={88} cy={52} rx={14} ry={24} fill={color.salvia} transform="rotate(-18 88 52)" {...CANTO} />
      </Capa>
      <Capa>
        <Circle cx={60} cy={62} r={32} fill={hoja.colores.mostaza} {...CANTO} />
      </Capa>
      <Ellipse cx={60} cy={78} rx={16} ry={12} fill={color.cartulina} />
      <Ellipse cx={60} cy={72} rx={6} ry={4.5} fill={color.tinta} />
      <Circle cx={48} cy={56} r={3.5} fill={color.tinta} />
      <Circle cx={72} cy={56} r={3.5} fill={color.tinta} />
    </>
  ),
  // Escudo con tilde: vacunas.
  vacuna: (
    <>
      <Capa>
        <Path d="M60 14 L94 26 L94 58 C94 80 78 96 60 104 C42 96 26 80 26 58 L26 26 Z" fill={color.mostaza} {...CANTO} />
      </Capa>
      <Path d="M60 26 L84 34 L84 58 C84 74 73 86 60 92 Z" fill={hoja.colores.mostaza} />
      <Path d="M44 60 L55 71 L77 47" fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Receta con cápsula: medicación vacía.
  receta: (
    <>
      <Capa>
        <Rect x={24} y={16} width={60} height={82} rx={6} fill={color.cartulina} transform="rotate(-5 54 57)" {...CANTO} />
      </Capa>
      <G transform="rotate(-5 54 57)">
        <Rect x={34} y={30} width={26} height={6} rx={3} fill={color.terracota} />
        <Rect x={34} y={44} width={40} height={4} rx={2} fill="#E4D6C6" />
        <Rect x={34} y={54} width={34} height={4} rx={2} fill="#E4D6C6" />
        <Rect x={34} y={64} width={38} height={4} rx={2} fill="#E4D6C6" />
      </G>
      <G transform="rotate(-35 82 84)">
        <Capa>
          <Rect x={62} y={74} width={42} height={20} rx={10} fill={color.rosa} {...CANTO} />
        </Capa>
        <Path d="M83 74 L94 74 A10 10 0 0 1 94 94 L83 94 Z" fill={color.terracota} />
      </G>
    </>
  ),
  // Ficha con cruz: emergencia.
  ficha: (
    <>
      <Capa>
        <Rect x={18} y={28} width={84} height={64} rx={8} fill={color.cartulina} {...CANTO} />
      </Capa>
      <Capa>
        <Path d="M38 44 h10 v10 h10 v10 h-10 v10 h-10 v-10 h-10 v-10 h10 Z" fill={color.terracota} {...CANTO} />
      </Capa>
      <Rect x={66} y={46} width={26} height={5} rx={2.5} fill="#E4D6C6" />
      <Rect x={66} y={58} width={20} height={5} rx={2.5} fill="#E4D6C6" />
      <Rect x={66} y={70} width={24} height={5} rx={2.5} fill={hoja.colores.salvia} />
    </>
  ),
};

export const NOMBRES_ILUSTRACION = Object.keys(DIBUJOS);

export default function Ilustracion({ nombre, size = 96, style }) {
  const dibujo = DIBUJOS[nombre];
  if (!dibujo) return null;
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {dibujo}
      </Svg>
    </View>
  );
}
