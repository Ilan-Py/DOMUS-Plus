import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// TODO: reemplazar por la pantalla real (data-screen="register" del mockup)
export default function RegisterScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Register — pendiente de implementar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.textMuted,
  },
});
