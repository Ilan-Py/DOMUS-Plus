import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { colors } from '../theme/colors';

// Primitiva única reutilizada para armar las siluetas de cada pantalla
// (FamilyListScreen, CalendarScreen, ProfileDetailScreen) en vez de un
// shimmer propio por screen — cada una compone su propia forma (círculo de
// avatar, líneas de texto, badge) apilando este bloque con distintos
// width/height/borderRadius. Pulso de opacity (nativeDriver:true), no una
// animación de backgroundColor — más liviano y evita el color-interpolation
// que obliga a desactivar el driver nativo.
// Pulso lento: se ve tranquilo, no ansioso.
const PULSE_DURATION = 1400;

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
      style={[{ width, height, borderRadius, backgroundColor: '#EFE8DF', opacity }, style]}
    />
  );
}

// Filas de lista en arena suave para reemplazar spinners sueltos (documentos, contactos,
// pendientes de hoy). `miniatura` agrega el cuadradito de la izquierda (adjuntos).
export function SkeletonFilas({ filas = 2, miniatura = false, style }) {
  return (
    <View style={[{ gap: 12 }, style]} accessibilityLabel="Cargando…" accessibilityLiveRegion="polite">
      {Array.from({ length: filas }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {miniatura && <Skeleton width={48} height={48} borderRadius={10} />}
          <View style={{ flex: 1 }}>
            <Skeleton width="65%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}
