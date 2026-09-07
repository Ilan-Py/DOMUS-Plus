import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';

// Unifica el formErrorBox duplicado en LoginScreen, RegisterScreen y
// GroupSetupScreen para errores generales (401/500) no atados a un campo.
// Renderiza null si no hay mensaje, así el caller no necesita el `{!!x && (...)}`.
export default function ErrorBanner({ message, onDismiss, onRetry }) {
  if (!message) return null;

  return (
    <View style={styles.box}>
      <Text style={styles.text}>{message}</Text>
      {!!onRetry && (
        <PressScale
          onPress={onRetry}
          hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
          accessibilityLabel="Reintentar"
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Reintentar</Text>
        </PressScale>
      )}
      {!!onDismiss && (
        <PressScale
          onPress={onDismiss}
          hitSlop={{ top: 14, bottom: 14, left: 16, right: 16 }}
          accessibilityLabel="Cerrar aviso"
        >
          <Text style={styles.dismissIcon}>✕</Text>
        </PressScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 4,
    padding: 12,
    borderRadius: radii.input,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
  },
  dismissIcon: {
    marginLeft: 10,
    fontSize: 13,
    color: colors.error,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
  },
  retryText: {
    marginLeft: 10,
    fontSize: 12.5,
    color: colors.error,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    textDecorationLine: 'underline',
  },
});
