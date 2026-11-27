import { useWindowDimensions } from 'react-native';
import { SIDEBAR_WIDTH, SIDEBAR_BREAKPOINT, CONTENT_MAX_WIDTH } from '../navigation/SideBar';

// Margen horizontal para centrar el contenido de una pantalla en una columna de
// `maxWidth` px a la derecha de la barra lateral, SIN encerrar el scroll en esa
// columna: el ScrollView ocupa todo el ancho (así su barra de desplazamiento
// queda contra el borde del navegador) y el contenido se separa con este
// padding. Debajo de SIDEBAR_BREAKPOINT no hay barra lateral y devuelve 0.
export default function useColumnInset(maxWidth = CONTENT_MAX_WIDTH) {
  const { width } = useWindowDimensions();
  if (width < SIDEBAR_BREAKPOINT) return 0;
  const disponible = width - SIDEBAR_WIDTH;
  return Math.max(0, (disponible - Math.min(maxWidth, disponible)) / 2);
}
