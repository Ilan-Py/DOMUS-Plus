// React Native ignora `fontWeight` sobre una fuente custom cargada (Poppins)
// a menos que cada peso esté registrado bajo su propio nombre de familia
// (ver App.js: useFonts carga Poppins_400Regular/600SemiBold/700Bold).
// `poppinsWeight` traduce el string de fontWeight que ya usan los estilos
// existentes al nombre de familia correspondiente, para usarlo junto a
// `fontFamily: poppinsWeight('700')` sin tener que tocar el valor de
// fontWeight (se mantiene por las dudas de un fallback web que sí lo respeta).
const POPPINS_WEIGHTS = {
  '400': 'Poppins_400Regular',
  '600': 'Poppins_600SemiBold',
  '700': 'Poppins_700Bold',
};

export function poppinsWeight(weight) {
  return POPPINS_WEIGHTS[weight] || POPPINS_WEIGHTS['400'];
}
