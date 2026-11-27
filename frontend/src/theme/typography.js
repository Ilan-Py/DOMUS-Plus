// Plus Jakarta Sans (cálida y legible). React Native ignora `fontWeight` sobre una
// fuente custom, y en web el navegador "engorda" artificialmente cualquier
// fuente declarada con peso >= 600, así que NO se usa fontWeight junto a estas
// fuentes: el peso lo da el nombre de la familia.
//
// Escala (los estilos existentes piden '400' / '600' / '700'):
//   '700' (títulos)                                  -> 600 SemiBold (techo)
//   '600' (botones, pestañas, nombres, subtítulos)   -> 500 Medium
//   '400' (fechas, direcciones, descripciones)       -> 400 Regular
// Cargadas en App.js (useFonts).
const WEIGHTS = {
  '400': 'PlusJakartaSans_400Regular',
  '500': 'PlusJakartaSans_500Medium',
  '600': 'PlusJakartaSans_500Medium',
  '700': 'PlusJakartaSans_600SemiBold',
};

// Nombre histórico (antes era Poppins); se mantiene para no tocar cada pantalla.
export function poppinsWeight(weight) {
  return WEIGHTS[weight] || WEIGHTS['400'];
}

// Títulos de la pantalla de bienvenida: serif cálido (Lora). El resto de la app
// va en Plus Jakarta Sans.
export const SERIF_BOLD = 'Lora_700Bold';
