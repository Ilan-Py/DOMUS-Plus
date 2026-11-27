import React from 'react';
import { Platform } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { colors } from '../theme/colors';

// Stickers de recorte de papel para ConfirmModal (viewBox 100×100): contorno blanco de 4 px y sombra cálida
// en dos capas. Tres variantes: `logout` (puerta entreabierta con flecha de salida), `danger` (tacho) e `info`
// (círculo con "i"). Son decorativos: van ocultos para lectores de pantalla.
const TERRACOTA = '#C24623';
const ARENA = '#F3EAE0';
const OCRE = '#C88D32';
const BORDE = { fill: '#FFFFFF', stroke: '#FFFFFF', strokeWidth: 8, strokeLinejoin: 'round', strokeLinecap: 'round' };
const SOMBRA = Platform.select({
  web: { filter: 'drop-shadow(0 1px 1px rgba(42, 36, 33, 0.14)) drop-shadow(0 6px 8px rgba(42, 36, 33, 0.12))' },
  default: {},
});

// Colores de acento por variante (también los usa ConfirmModal para el botón principal).
export const ACENTOS = { logout: TERRACOTA, danger: '#AA451D', info: colors.salvia };

function Puerta() {
  return (
    <>
      {/* marco + hueco (borde blanco primero, color después) */}
      <Rect x={20} y={12} width={60} height={78} rx={6} {...BORDE} />
      <Rect x={20} y={12} width={60} height={78} rx={6} fill={ARENA} />
      <Rect x={26} y={18} width={48} height={66} rx={3} fill="#E6D3BC" />
      {/* hoja de la puerta, entreabierta (bisagra a la izquierda) */}
      <Path d="M26 18 L54 25 V80 L26 84 Z" fill={TERRACOTA} />
      <Circle cx={48} cy={53} r={3} fill={OCRE} />
      {/* flecha de salida, con contorno blanco */}
      <G>
        <Path d="M58 56 H88 M79 46 L89 56 L79 66" stroke="#FFFFFF" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M58 56 H88 M79 46 L89 56 L79 66" stroke={TERRACOTA} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </G>
    </>
  );
}

function Tacho() {
  const cuerpo = 'M28 36 H72 L68 86 Q68 90 64 90 H36 Q32 90 32 86 Z';
  const tapa = 'M22 26 H78 V34 H22 Z';
  const asa = 'M40 26 V20 Q40 16 44 16 H56 Q60 16 60 20 V26';
  return (
    <>
      <Path d={cuerpo} {...BORDE} />
      <Path d={tapa} {...BORDE} />
      <Path d={asa} stroke="#FFFFFF" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={asa} stroke={OCRE} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={cuerpo} fill={ACENTOS.danger} />
      <Path d={tapa} fill={ARENA} />
      <Path d="M43 46 V78 M50 46 V78 M57 46 V78" stroke="#FBE3DA" strokeWidth={3.5} strokeLinecap="round" />
    </>
  );
}

function Info() {
  return (
    <>
      <Circle cx={50} cy={50} r={36} {...BORDE} />
      <Circle cx={50} cy={50} r={36} fill={ACENTOS.info} />
      <Circle cx={50} cy={32} r={5} fill="#FFFFFF" />
      <Rect x={45} y={43} width={10} height={28} rx={5} fill="#FFFFFF" />
    </>
  );
}

const DIBUJOS = { logout: Puerta, danger: Tacho, info: Info };

export default function StickerConfirm({ variante = 'info', size = 72 }) {
  const Dibujo = DIBUJOS[variante] || Info;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={SOMBRA}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Dibujo />
    </Svg>
  );
}
