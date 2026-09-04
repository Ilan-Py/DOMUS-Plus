import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { BLOB_PATH } from './RadialFab';

// Reusa el mismo path de blob de RadialFab (import, no copiado a mano de
// nuevo) para el único lugar de la app con un loading state realmente de
// pantalla completa: el splash de App.js mientras cargan las fuentes o se
// rehidrata la sesión. Rotación continua + pulso de escala en vez del
// ActivityIndicator nativo — mismo motivo que Skeleton: nativeDriver:true en
// ambos (rotate y scale son transforms), sin costo de JS thread por frame.
export default function BlobSpinner({ size = 56, color = colors.ink }) {
  const rotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotateLoop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    rotateLoop.start();
    pulseLoop.start();
    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
    };
  }, [rotate, pulse]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate: spin }, { scale }] }}>
      <Svg width={size} height={size} viewBox="-60 -60 120 120">
        <Path d={BLOB_PATH} fill={color} />
      </Svg>
    </Animated.View>
  );
}
