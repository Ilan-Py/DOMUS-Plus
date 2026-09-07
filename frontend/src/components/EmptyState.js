import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, radii, shadow } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';

// Usado por FamilyListScreen (sin integrantes/mascotas), CalendarScreen
// (sin recordatorios) y ProfileDetailScreen (sin vacunas/tratamientos/
// eventos de historial). El anillo decorativo vivía copiado a mano sólo en
// ProfileDetailScreen (styles.emptyIcon ahí) — se sube acá adentro para que
// las tres pantallas se vean iguales sin duplicar el mismo View idéntico
// una tercera vez.
//
// Fade-in simple al montar (no existía ningún tratamiento de entrada antes
// de esta pasada) — mismo criterio que FadeSlideIn (opacity+translateY,
// nativeDriver), sin reusar ese componente porque acá no hay stagger por
// índice, es una sola aparición.
export default function EmptyState({ message, actionLabel, onAction }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return (
    <Animated.View style={[styles.root, { opacity: anim, transform: [{ translateY }] }]}>
      <View style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
      {!!actionLabel && !!onAction && (
        <PressScale contentStyle={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </PressScale>
      )}
    </Animated.View>
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
