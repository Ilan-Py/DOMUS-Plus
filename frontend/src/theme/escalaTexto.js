import React from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { EscalaTextoContext } from '../context/PreferenciasContext';

// Escala de texto global ("Tamaño de texto" en Mi cuenta): multiplica el fontSize y el lineHeight de todos los
// <Text> y <TextInput> de la app por el factor elegido (1, 1,15 o 1,3). Se hace parchando el render de los dos
// componentes una sola vez (hay cientos de estilos con tamaños fijos y no se puede tocar uno por uno); cada
// Text lee el factor del contexto, así que cambia en el momento sin recargar ni perder la pantalla.
// Con factor 1 no agrega nada (mismo comportamiento de siempre).
function parchear(Componente, tamanoPorDefecto) {
  if (!Componente || typeof Componente.render !== 'function' || Componente.__escalado) return;
  const original = Componente.render;
  Componente.render = function renderEscalado(props, ref) {
    const escala = React.useContext(EscalaTextoContext);
    if (escala === 1) return original.call(this, props, ref);
    const plano = StyleSheet.flatten(props.style) || {};
    const extra = { fontSize: (plano.fontSize || tamanoPorDefecto) * escala };
    if (plano.lineHeight) extra.lineHeight = plano.lineHeight * escala;
    return original.call(this, { ...props, style: [props.style, extra] }, ref);
  };
  Componente.__escalado = true;
}

parchear(Text, 14);
parchear(TextInput, 14);
