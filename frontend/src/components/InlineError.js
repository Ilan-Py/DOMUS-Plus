import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';

// Error dentro de una tarjeta: mensaje claro (nunca el texto técnico del
// servidor) y un botón "Reintentar" que vuelve a ejecutar la carga de esa
// sección.
export default function InlineError({ message, onRetry }) {
  return (
    <View style={styles.box} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Ionicons name="alert-circle-outline" size={22} color={colors.error} />
        <Text style={styles.text}>{message}</Text>
      </View>
      {!!onRetry && (
        <PressScale contentStyle={styles.retry} onPress={onRetry} accessibilityLabel="Reintentar">
          <Ionicons name="refresh" size={18} color={colors.ink} />
          <Text style={styles.retryText}>Reintentar</Text>
        </PressScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  text: { flex: 1, fontSize: 16, lineHeight: 22, color: colors.error, fontFamily: poppinsWeight('600') },
  retry: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  retryText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
});
