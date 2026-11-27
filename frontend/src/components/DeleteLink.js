import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';

// Acción de eliminar al pie de una pantalla de edición: texto terracota sin
// relleno, discreto pero con 52dp de alto. La confirmación la pide quien la usa
// (confirmarDestructivo).
export default function DeleteLink({ label, onPress, disabled, busy }) {
  return (
    <PressScale
      contentStyle={styles.btn}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
    >
      <Text style={styles.text}>{busy ? 'Eliminando…' : label}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.limeDeep },
});
