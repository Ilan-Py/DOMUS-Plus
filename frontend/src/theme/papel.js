// Tokens del lenguaje "papercut". Se apoyan en la paleta que ya tiene la app (theme/colors.js): donde el
// pedido traía un valor distinto (#C4472B, #4F6F5E, #D9A23B…) se mantiene el actual para no romper contraste
// ni pantallas ya validadas. Lo único realmente nuevo es la cartulina, el rosa empolvado y las capas.
import { colors } from './colors';

export const papel = {
  fondo: colors.bg, // papel base (crema)
  cartulina: '#FFFDF9', // superficie de las tarjetas
  tinta: colors.ink,
  terracota: colors.accentStrong, // primario
  salvia: colors.salvia, // mascotas, "al día"
  mostaza: colors.ocre, // vacunas y turnos
  rosa: '#E8A598', // medicación (rosa empolvado)
  // Hojas de color que asoman detrás de las tarjetas destacadas.
  hoja: {
    terracota: '#E3A28C',
    salvia: '#A7C2B3',
    mostaza: '#E8C078',
    rosa: '#E8A598',
    arena: '#E4D6C6',
  },
  radio: 16, // tarjetas: 14–18 px
};

// Sombras de papel apilado: en vez de blur difuso, capas duras desplazadas. Tres niveles.
// Cada una es [capa fina de contacto, hoja inferior (color), sombra dura suave].
const TINTA = '43, 33, 28';
export const SOMBRA_PAPEL = {
  1: `0 1px 0 rgba(${TINTA}, .06), 3px 4px 0 -1px #EFE5D8, 3px 4px 0 0 rgba(${TINTA}, .08)`,
  2: `0 1px 0 rgba(${TINTA}, .06), 4px 5px 0 -1px #E9DDCE, 4px 5px 0 0 rgba(${TINTA}, .09), 8px 10px 0 -2px #F2E9DD`,
  3: `0 1px 0 rgba(${TINTA}, .07), 5px 6px 0 -1px #E4D6C6, 5px 6px 0 0 rgba(${TINTA}, .10), 10px 12px 0 -2px #EEE3D5, 10px 12px 0 -1px rgba(${TINTA}, .06)`,
};

// Equivalente para nativo (iOS: una sola sombra dura; Android: elevation).
export const SOMBRA_NATIVA = {
  1: { shadowColor: '#2B211C', shadowOffset: { width: 3, height: 4 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 1 },
  2: { shadowColor: '#2B211C', shadowOffset: { width: 4, height: 5 }, shadowOpacity: 0.12, shadowRadius: 0, elevation: 2 },
  3: { shadowColor: '#2B211C', shadowOffset: { width: 5, height: 6 }, shadowOpacity: 0.14, shadowRadius: 0, elevation: 3 },
};
