import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Extraído de RadialFab.js (auditoría de consolidación de FAB) — el blob
// orgánico hecho a mano con curvas cúbicas alrededor del origen (radio
// ~46-58, no un círculo perfecto) es la pieza visual compartida entre el FAB
// multi-opción (RadialFab: FamilyListScreen/ProfileDetailScreen) y el FAB de
// una sola acción (CalendarScreen). La interacción (long-press → menú
// radial vs. tap simple → navegación directa) sigue siendo genuinamente
// distinta entre ambos casos — sólo la forma/sombra se unifica acá, no se
// fuerza el menú radial sobre un FAB de un solo destino.
export const BLOB_PATH =
  'M42,-28 C54,-14 56,10 46,26 C36,42 12,50 -10,46 C-34,42 -52,24 -54,0 ' +
  'C-56,-24 -42,-46 -18,-52 C6,-58 30,-44 42,-28 Z';

export default function Blob({ size, color, extraStyle }) {
  return (
    <Svg width={size} height={size} viewBox="-60 -60 120 120" style={extraStyle}>
      <Path d={BLOB_PATH} fill={color} />
    </Svg>
  );
}
