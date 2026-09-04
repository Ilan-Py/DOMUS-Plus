import React from 'react';
import { Text } from 'react-native';
import { poppinsWeight } from '../theme/typography';

// Patrón recomendado para aplicar una fuente global sin mutar
// Text.defaultProps (deprecado en React — Text/TextInput de RN 0.74 son
// componentes forwardRef; React ya emite warning de defaultProps sobre
// function components desde 18.3 y lo elimina en 19; este proyecto está en
// React 18.2, así que todavía no rompe, pero está en la cuenta regresiva).
// Hoy ningún archivo de la app usa Text.defaultProps/TextInput.defaultProps
// — no hay nada roto que arreglar — así que este componente NO reemplaza
// los 67 <Text> ya existentes en 17 archivos; queda documentado como el
// camino a seguir para código nuevo. Migrar los call-sites existentes es un
// follow-up aparte, no un sweep silencioso acá.
export default function AppText({ weight = '400', style, ...rest }) {
  return <Text style={[{ fontFamily: poppinsWeight(weight) }, style]} {...rest} />;
}
