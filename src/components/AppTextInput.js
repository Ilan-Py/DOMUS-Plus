import React from 'react';
import { TextInput } from 'react-native';
import { poppinsWeight } from '../theme/typography';

// Ver AppText.js para el razonamiento completo (defaultProps deprecado en
// React, forwardRef, etc.) — mismo patrón acá. Único consumidor real de
// TextInput hoy es FormField.js, y su estilo `input` no fija fontFamily —
// el texto tipeado cae en la fuente del sistema, no Poppins, mismo síntoma
// de fondo que este componente evita para código nuevo. No migrado acá
// (ver AppText.js), queda como follow-up documentado.
export default function AppTextInput({ weight = '400', style, ...rest }) {
  return <TextInput style={[{ fontFamily: poppinsWeight(weight) }, style]} {...rest} />;
}
