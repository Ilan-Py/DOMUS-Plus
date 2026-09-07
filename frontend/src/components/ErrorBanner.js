import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';

// Unifica el formErrorBox duplicado en LoginScreen, RegisterScreen y
// GroupSetupScreen para errores generales (401/500) no atados a un campo.
// Renderiza null si no hay mensaje, así el caller no necesita el `{!!x && (...)}`.
//
// `variant` generaliza la misma estructura (caja con hairline + texto + las
// acciones opcionales reintentar/cerrar) a un aviso neutral que NO es un
// error: la nota de "sos dueño del grupo" en AccountScreen era un <Text>
// suelto sin contenedor, y duplicar acá la misma fila sólo para cambiarle
// los colores no aportaba nada. 'error' (default) queda exactamente como
// estaba — todos los call-sites existentes no lo pasan.
const VARIANTS = {
  error: {
    box: { backgroundColor: colors.errorBg, borderColor: colors.error },
    text: { color: colors.error, fontWeight: '600', fontFamily: poppinsWeight('600') },
    action: { color: colors.error },
    icon: null,
  },
  info: {
    box: { backgroundColor: colors.bgBase, borderColor: colors.line, alignItems: 'flex-start' },
    // Peso/tamaño de nota al pie, no de alerta — este variant informa, no
    // interrumpe (ver duenoNota, el <Text> que reemplaza en AccountScreen).
    text: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, fontWeight: '400' },
    action: { color: colors.textMuted },
    icon: 'information-circle-outline',
  },
};

export default function ErrorBanner({ message, onDismiss, onRetry, variant = 'error' }) {
  if (!message) return null;

  const v = VARIANTS[variant] || VARIANTS.error;

  return (
    <View style={[styles.box, v.box]}>
      {!!v.icon && (
        <Ionicons name={v.icon} size={16} color={v.action.color} style={styles.leadingIcon} />
      )}
      <Text style={[styles.text, v.text]}>{message}</Text>
      {!!onRetry && (
        <PressScale
          onPress={onRetry}
          hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
          accessibilityLabel="Reintentar"
          accessibilityRole="button"
        >
          <Text style={[styles.retryText, v.action]}>Reintentar</Text>
        </PressScale>
      )}
      {!!onDismiss && (
        <PressScale
          onPress={onDismiss}
          hitSlop={{ top: 14, bottom: 14, left: 16, right: 16 }}
          accessibilityLabel="Cerrar aviso"
        >
          <Text style={[styles.dismissIcon, v.action]}>✕</Text>
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
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leadingIcon: {
    marginRight: 8,
    // El ícono acompaña la primera línea del texto, no el centro del bloque
    // (el aviso neutral puede ocupar 3-4 líneas).
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 13,
  },
  dismissIcon: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
  },
  retryText: {
    marginLeft: 10,
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    textDecorationLine: 'underline',
  },
});
