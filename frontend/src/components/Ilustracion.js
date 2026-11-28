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

// ---- Estacionales (cabecera del Calendario): una por época del año en Buenos Aires.
const LILA = '#9B87C4';
const LILA_CLARO = '#C8B8E6';
Object.assign(DIBUJOS, {
  // Jacarandá en flor (octubre–noviembre): rama con racimos lilas y dos flores caídas.
  jacaranda: (
    <>
      {/* La rama es un trazo: va sin «Capa» (la sombra rellenaría la curva). */}
      <Path d="M17 100 C37 82 55 68 79 56 C91 50 101 44 109 34" fill="none" stroke="#E4D6C6" strokeWidth={5} strokeLinecap="round" />
      <Path d="M14 96 C34 78 52 64 76 52 C88 46 98 40 106 30" fill="none" stroke="#6E5A47" strokeWidth={5} strokeLinecap="round" />
      <Path d="M48 68 C46 58 40 50 32 48" fill="none" stroke="#6E5A47" strokeWidth={3} strokeLinecap="round" />
      {[[30, 44, 11], [44, 36, 9], [70, 40, 12], [88, 26, 10], [100, 46, 8], [58, 56, 8]].map(([cx, cy, r], i) => (
        <Capa key={i}>
          <Circle cx={cx} cy={cy} r={r} fill={i % 2 ? LILA_CLARO : LILA} {...CANTO} />
        </Capa>
      ))}
      <Ellipse cx={26} cy={104} rx={5} ry={3} fill={LILA} transform="rotate(-20 26 104)" />
      <Ellipse cx={62} cy={108} rx={5} ry={3} fill={LILA_CLARO} transform="rotate(15 62 108)" />
    </>
  ),
  // Sol de papel (diciembre–febrero).
  verano: (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((g) => (
        <Rect key={g} x={57} y={12} width={6} height={18} rx={3} fill={hoja.colores.mostaza} transform={`rotate(${g} 60 60)`} />
      ))}
      <Capa>
        <Circle cx={60} cy={60} r={30} fill={color.mostaza} {...CANTO} />
      </Capa>
      <Circle cx={50} cy={56} r={3} fill={color.tinta} />
      <Circle cx={70} cy={56} r={3} fill={color.tinta} />
      <Path d="M50 68 Q60 76 70 68" fill="none" stroke={color.tinta} strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  // Hojas de otoño (marzo–mayo).
  otono: (
    <>
      <Capa>
        <Path d="M30 84 C20 60 34 36 58 30 C62 54 54 76 30 84 Z" fill={color.terracota} {...CANTO} />
      </Capa>
      <Capa>
        <Path d="M64 92 C60 66 76 46 100 44 C100 68 88 88 64 92 Z" fill={color.mostaza} {...CANTO} />
      </Capa>
      <Path d="M32 82 L56 34" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
      <Path d="M66 90 L98 46" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
      <Capa>
        <Path d="M50 104 C46 92 54 82 66 80 C66 92 62 100 50 104 Z" fill={color.rosa} {...CANTO} />
      </Capa>
    </>
  ),
  // Mate humeante (junio–septiembre).
  invierno: (
    <>
      <Path d="M52 22 C46 30 58 34 52 42" fill="none" stroke="#C9BBA9" strokeWidth={3} strokeLinecap="round" />
      <Path d="M66 18 C60 26 72 30 66 38" fill="none" stroke="#C9BBA9" strokeWidth={3} strokeLinecap="round" />
      <Capa>
        <Path d="M34 52 L86 52 C86 80 76 100 60 100 C44 100 34 80 34 52 Z" fill={color.salvia} {...CANTO} />
      </Capa>
      <Rect x={34} y={46} width={52} height={10} rx={5} fill={hoja.colores.mostaza} />
      <Capa>
        <Rect x={70} y={20} width={6} height={44} rx={3} fill="#B8B2A7" transform="rotate(18 73 42)" {...CANTO} />
      </Capa>
      <Rect x={40} y={70} width={40} height={6} rx={3} fill={color.terracota} />
    </>
  ),
});

// ---- Escenas chicas para estados vacíos de la ficha.
Object.assign(DIBUJOS, {
  // Casita de la veterinaria: sin veterinario cargado.
  veterinaria: (
    <>
      <Capa>
        <Rect x={22} y={54} width={76} height={50} rx={4} fill={color.cartulina} {...CANTO} />
      </Capa>
      <Capa>
        <Path d="M14 58 L60 22 L106 58 Z" fill={color.salvia} {...CANTO} />
      </Capa>
      <Rect x={50} y={76} width={20} height={28} rx={3} fill={hoja.colores.mostaza} />
      <Capa>
        <Path d="M54 38 h12 v8 h8 v12 h-8 v8 h-12 v-8 h-8 v-12 h8 Z" fill="#FFFFFF" {...CANTO} stroke={color.terracota} strokeWidth={2} />
      </Capa>
      <Circle cx={34} cy={74} r={6} fill={color.rosa} />
      <Circle cx={86} cy={74} r={6} fill={color.rosa} />
    </>
  ),
  // Portapapeles: sin tratamientos ni historial.
  portapapeles: (
    <>
      <Capa>
        <Rect x={28} y={20} width={64} height={86} rx={8} fill={hoja.colores.mostaza} {...CANTO} />
      </Capa>
      <Rect x={36} y={30} width={48} height={68} rx={4} fill={color.cartulina} />
      <Capa>
        <Rect x={46} y={14} width={28} height={14} rx={4} fill={color.salvia} {...CANTO} />
      </Capa>
      <Rect x={44} y={44} width={32} height={5} rx={2.5} fill="#E4D6C6" />
      <Rect x={44} y={56} width={26} height={5} rx={2.5} fill="#E4D6C6" />
      <Rect x={44} y={68} width={30} height={5} rx={2.5} fill="#E4D6C6" />
      <Path d="M44 84 L50 90 L62 78" fill="none" stroke={color.terracota} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
});

// ---- Escenas de la landing y el onboarding.
function Persona({ x, y, s = 1, ropa, piel = '#E9C6A8' }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Capa>
        <Path d="M-12 30 C-12 14 12 14 12 30 Z" fill={ropa} {...CANTO} />
      </Capa>
      <Capa>
        <Circle cx={0} cy={6} r={8} fill={piel} {...CANTO} />
      </Capa>
    </G>
  );
}
Object.assign(DIBUJOS, {
  // Familia y su perro (paso 2: sumás personas y mascotas).
  familiaperro: (
    <>
      <Rect x={8} y={96} width={104} height={8} rx={4} fill="#E4D6C6" />
      <Persona x={34} y={58} s={1.25} ropa={color.terracota} />
      <Persona x={62} y={52} s={1.4} ropa={color.salvia} />
      <Persona x={86} y={70} s={0.95} ropa={hoja.colores.mostaza} />
      <G transform="translate(14 78)">
        <Capa>
          <Ellipse cx={10} cy={10} rx={11} ry={8} fill="#C9A27E" {...CANTO} />
        </Capa>
        <Capa>
          <Circle cx={20} cy={2} r={6} fill="#C9A27E" {...CANTO} />
        </Capa>
        <Circle cx={22} cy={1} r={1.4} fill={color.tinta} />
      </G>
      <Path d="M60 22 C57 18 51 19 52 24 C53 27 57 29 60 32 C63 29 67 27 68 24 C69 19 63 18 60 22 Z" fill={color.rosa} {...CANTO} />
    </>
  ),
  // Campanita con avisos (paso 3: todos ven lo mismo y llegan los avisos).
  campana: (
    <>
      <Capa>
        <Path d="M60 22 C40 22 34 40 34 58 L34 74 L26 84 L94 84 L86 74 L86 58 C86 40 80 22 60 22 Z" fill={hoja.colores.mostaza} {...CANTO} />
      </Capa>
      <Capa>
        <Circle cx={60} cy={92} r={8} fill={color.terracota} {...CANTO} />
      </Capa>
      <Rect x={56} y={14} width={8} height={10} rx={4} fill={color.tinta} />
      <Capa>
        <Rect x={82} y={26} width={30} height={20} rx={6} fill={color.cartulina} {...CANTO} />
      </Capa>
      <Path d="M88 36 L94 41 L105 31" fill="none" stroke={color.salvia} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 40 Q14 52 20 64 M12 34 Q4 52 12 70" fill="none" stroke={color.rosa} strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  // Padres a la distancia: dos casitas unidas por un hilo con corazón.
  distancia: (
    <>
      <Path d="M30 78 C46 56 74 56 90 78" fill="none" stroke={color.rosa} strokeWidth={3} strokeDasharray="5 6" strokeLinecap="round" />
      <G transform="translate(6 62)">
        <Capa>
          <Rect x={4} y={20} width={30} height={24} rx={3} fill={color.cartulina} {...CANTO} />
        </Capa>
        <Capa>
          <Path d="M0 22 L19 4 L38 22 Z" fill={color.terracota} {...CANTO} />
        </Capa>
        <Rect x={15} y={30} width={8} height={14} rx={4} fill={color.salvia} />
      </G>
      <G transform="translate(76 62)">
        <Capa>
          <Rect x={4} y={20} width={30} height={24} rx={3} fill={color.cartulina} {...CANTO} />
        </Capa>
        <Capa>
          <Path d="M0 22 L19 4 L38 22 Z" fill={color.salvia} {...CANTO} />
        </Capa>
        <Rect x={15} y={30} width={8} height={14} rx={4} fill={hoja.colores.mostaza} />
      </G>
      <Capa>
        <Path d="M60 42 C55 34 44 36 46 46 C47 52 55 56 60 62 C65 56 73 52 74 46 C76 36 65 34 60 42 Z" fill={color.terracota} {...CANTO} />
      </Capa>
    </>
  ),
});

// Ilustración de la época para un mes (0 = enero).
export function ilustracionDelMes(mes) {
  if (mes === 9 || mes === 10) return 'jacaranda';
  if (mes === 11 || mes <= 1) return 'verano';
  if (mes <= 4) return 'otono';
  return 'invierno';
}

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
