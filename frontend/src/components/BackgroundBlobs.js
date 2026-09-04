import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';

// Extraído tras aparecer por tercera vez (Login, Register, ProfileDetail) —
// mismas dos formas decorativas en todas: un blob terracota arriba a la
// derecha y uno sage abajo a la izquierda.
//
// Nota migración 2 (hogareño): esto no usa BlurView/backdropFilter en
// ningún lado — el desenfoque acá es un `filter: blur()` sobre la forma
// misma, sólo en web, independiente de si el card de encima es de vidrio o
// blanco sólido. La razón original para agregarlas (dar textura a un fondo
// parejo detrás de un card de vidrio traslúcido) ya no aplica con cards
// blancos sólidos, pero se mantienen: siguen dando calidez/textura al fondo
// crema alrededor del card (que ahora es 100% opaco y las tapa del todo en
// su propia área) — colors.lime/colors.sage ya son terracota/salvia bajo la
// paleta nueva, encajan con la dirección "hogareño" sin cambios de valor.
const blobBlurStyle = Platform.select({
  web: { filter: 'blur(60px)' },
  default: {},
});

export default function BackgroundBlobs() {
  return (
    <>
      <View style={[styles.blobGold, blobBlurStyle]} pointerEvents="none" />
      <View style={[styles.blobSage, blobBlurStyle]} pointerEvents="none" />
    </>
  );
}

const styles = StyleSheet.create({
  blobGold: {
    position: 'absolute',
    top: -60,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.lime,
    opacity: 0.35,
  },
  blobSage: {
    position: 'absolute',
    bottom: 60,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.sage,
    opacity: 0.55,
  },
});
