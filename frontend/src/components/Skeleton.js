import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { colors } from '../theme/colors';

// Primitiva única reutilizada para armar las siluetas de cada pantalla
// (FamilyListScreen, CalendarScreen, ProfileDetailScreen) en vez de un
// shimmer propio por screen — cada una compone su propia forma (círculo de
// avatar, líneas de texto, badge) apilando este bloque con distintos
// width/height/borderRadius. Pulso de opacity (nativeDriver:true), no una
// animación de backgroundColor — más liviano y evita el color-interpolation
// que obliga a desactivar el driver nativo.
const PULSE_DURATION = 800;

export default function Skeleton({ width = '100%', height = 14, borderRadius = 8, style }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: PULSE_DURATION, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: PULSE_DURATION, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: colors.line, opacity }, style]}
    />
  );
}
