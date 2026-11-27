import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';

// Logo de DOMUS+ (corazón con la familia y sus mascotas). Las imágenes tienen fondo
// transparente (assets/logo*.png):
//   - 'color':     el original (verde azulado → azul). Mejor sobre fondos blancos o crema claros.
//   - 'terracota': monocromo en el color de marca; se integra con la paleta cálida.
//   - 'blanco':    para fondos oscuros o terracota.
// Relación de aspecto ≈ 1,05 : 1 (casi cuadrado).
const FUENTES = {
  color: require('../../assets/logo.png'),
  terracota: require('../../assets/logo-terracota.png'),
  blanco: require('../../assets/logo-blanco.png'),
};
const ASPECTO = 673 / 640;

export default function Logo({ variante = 'color', size = 40, style }) {
  return (
    <Image
      source={FUENTES[variante] || FUENTES.color}
      style={[{ width: size * ASPECTO, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="Logo de DOMUS+"
    />
  );
}

// Símbolo + nombre, en una fila (menú lateral, barra superior de la bienvenida).
export function LogoConNombre({ variante = 'terracota', size = 36, color = colors.accentStrong, fontSize = 22 }) {
  return (
    <View style={styles.row} accessibilityLabel="DOMUS+" accessibilityRole="image">
      <Logo variante={variante} size={size} />
      <Text style={[styles.nombre, { color, fontSize, lineHeight: fontSize + 8 }]}>DOMUS+</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nombre: { fontFamily: poppinsWeight('700') },
});
