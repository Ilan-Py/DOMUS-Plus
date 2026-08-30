import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// TODO: reemplazar por la pantalla real (data-screen del mockup)
export default function AccountScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Mi cuenta — pendiente de implementar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
