import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { papel, SOMBRA_NATIVA } from '../theme/papel';
import { paper } from '../theme/paper';

// Tarjeta de cartulina: sin borde, radio 16, sombra de papel apilado (nivel 1, 2 o 3) y, al pasar el mouse, se
// levanta 2 px (CSS en theme/paper.js, respeta prefers-reduced-motion).
//
// `hoja`: color ('terracota' | 'salvia' | 'mostaza' | 'rosa' | 'arena') de una segunda hoja que asoma unos px
// detrás, girada ±1° (`rotacion`, en grados; usar -1 para alternar). Es sólo decoración y va detrás: la tarjeta en sí nunca se gira. Usarla en tarjetas
// destacadas (Hoy, ficha de emergencia), no en formularios ni en listas.
//
//   <PaperCard nivel={2} hoja="terracota" style={{ padding: 24 }}>…</PaperCard>
export default function PaperCard({ nivel = 1, hoja, rotacion = 1, style, wrapperStyle, children, ...rest }) {
  const color = hoja ? papel.hoja[hoja] || hoja : null;
  // Con hoja, la hoja es el papel apilado: la tarjeta lleva sólo la sombra de contacto (nivel 1) para que la hoja se
  // vea. Una sola señal de apilado por tarjeta.
  const nivelEfectivo = color ? 1 : nivel;
  const card = (
    <View
      {...paper('papel', `p${nivelEfectivo}`)}
      style={[styles.card, Platform.OS !== 'web' && SOMBRA_NATIVA[nivelEfectivo], style]}
      {...rest}
    >
      {children}
    </View>
  );
  if (!color) return wrapperStyle ? <View style={wrapperStyle}>{card}</View> : card;
  return (
    <View style={[styles.wrap, wrapperStyle]}>
      <View
        pointerEvents="none"
        style={[styles.hoja, { backgroundColor: color, transform: [{ rotate: `${rotacion}deg` }] }]}
      />
      {card}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  card: {
    position: 'relative',
    backgroundColor: papel.cartulina,
    borderRadius: papel.radio,
    borderWidth: 0,
  },
  // Asoma 5 px por abajo y por la derecha.
  hoja: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: -6,
    bottom: -7,
    borderRadius: papel.radio,
  },
});
