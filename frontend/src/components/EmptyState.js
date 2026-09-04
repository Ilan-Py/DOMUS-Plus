import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, shadow } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';

// Usado por FamilyListScreen (sin integrantes/mascotas), CalendarScreen
// (sin recordatorios) y ProfileDetailScreen (sin vacunas/tratamientos/
// eventos de historial). El anillo decorativo vivía copiado a mano sólo en
// ProfileDetailScreen (styles.emptyIcon ahí) — se sube acá adentro para que
// las tres pantallas se vean iguales sin duplicar el mismo View idéntico
// una tercera vez.
export default function EmptyState({ message, actionLabel, onAction }) {
  return (
    <View style={styles.root}>
      <View style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
      {!!actionLabel && !!onAction && (
        <PressScale contentStyle={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </PressScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  icon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: colors.line,
    opacity: 0.18,
    marginBottom: 18,
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actionBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.button,
    backgroundColor: colors.blueDeep,
    ...shadow,
  },
  actionText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    fontSize: 14,
  },
});
