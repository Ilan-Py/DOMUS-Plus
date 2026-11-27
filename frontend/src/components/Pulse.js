import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import useReducedMotion from '../hooks/useReducedMotion';

// "Pulse to confirm": un pulso breve (110 ms de ida + 190 ms de vuelta, < 300 ms) con un halo
// terracota suave, para dar certeza sin abrir alertas: copiar el código, guardar un comprobante.
// Late una vez cada vez que `trigger` cambia a un valor verdadero. Sin loops; con "reducir
// movimiento" no hace nada (el cambio de ícono/texto que lo acompaña ya confirma).
export default function Pulse({ trigger, style, radio = 16, intensidad = 1.05, children }) {
  const reduceMotion = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (!trigger || reduceMotion) return;
    v.setValue(0);
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 110, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 190, useNativeDriver: true }),
    ]).start();
  }, [trigger, reduceMotion, v]);

  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, intensidad] });
  const halo = v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { borderRadius: radio + 4, opacity: halo }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 2,
    borderColor: colors.accentStrong,
  },
});
