import React, { useEffect, useRef } from 'react';
import { View, Animated, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useReducedMotion from '../hooks/useReducedMotion';

// Cambio de ícono con crossfade + desenfoque leve (opacity + blur(2px), 150 ms): el que sale se
// desvanece y se desenfoca mientras el que entra se enfoca. Barato (transiciones CSS en web; sólo
// opacidad en nativo). Usado en Mostrar/Ocultar contraseña y en el copiado del código familiar.
const MS = 150;

export default function CrossfadeIcon({ a, b, showB, size = 22, color }) {
  const reduceMotion = useReducedMotion();
  const esWeb = Platform.OS === 'web';
  const t = useRef(new Animated.Value(showB ? 1 : 0)).current;

  useEffect(() => {
    if (esWeb) return;
    Animated.timing(t, { toValue: showB ? 1 : 0, duration: reduceMotion ? 0 : MS, useNativeDriver: true }).start();
  }, [showB, reduceMotion, esWeb, t]);

  const transicion = esWeb
    ? { transitionProperty: 'opacity, filter', transitionDuration: reduceMotion ? '0ms' : `${MS}ms`, transitionTimingFunction: 'ease-out' }
    : null;
  const capa = (visible, animado) =>
    esWeb
      ? [styles.capa, transicion, { opacity: visible ? 1 : 0, filter: visible ? 'blur(0px)' : 'blur(2px)' }]
      : [styles.capa, { opacity: animado }];

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={capa(!showB, t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }))}>
        <Ionicons name={a} size={size} color={color} />
      </Animated.View>
      <Animated.View style={capa(!!showB, t)}>
        <Ionicons name={b} size={size} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  capa: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
