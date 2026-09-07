import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

// Feedback de presión compartido — reemplaza el "nada visible más que lo que
// da gratis TouchableOpacity" en botones/cards/FABs. Pressable (no
// TouchableOpacity) porque necesitamos onPressIn/onPressOut separados del
// onPress para animar entrada y salida por separado, no sólo un fade.
// scale+opacity, ambos nativeDriver-elegibles, 100ms — rápido a propósito,
// para que se sienta responsivo y no relentice el tap real.
const PRESS_SCALE = 0.97;
const PRESS_OPACITY = 0.85;
const PRESS_DURATION = 100;

export default function PressScale({
  onPress,
  onLongPress,
  disabled,
  style,
  contentStyle,
  children,
  accessibilityRole = 'button',
  ...rest
}) {
  const anim = useRef(new Animated.Value(0)).current;
  // Pressable dispara onPress en el release incluso después de que
  // onLongPress ya calificó — sin este flag, soltar un long-press también
  // ejecuta onPress (mismo bug que RadialFab.js ya resolvía a mano con su
  // propio longPressFiredRef; acá se centraliza para que CUALQUIER
  // consumidor de PressScale que use ambos handlers a la vez quede cubierto,
  // no sólo el FAB). Se resetea en cada onPressIn, no sólo al consumirse —
  // así un long-press que dispara pero se suelta afuera del hitbox (sin
  // volver a pasar por onPress) no deja el flag pegado en `true` para el
  // próximo tap.
  const longPressFiredRef = useRef(false);

  function animateTo(toValue) {
    Animated.timing(anim, { toValue, duration: PRESS_DURATION, useNativeDriver: true }).start();
  }

  function handlePressIn() {
    longPressFiredRef.current = false;
    animateTo(1);
  }

  function handlePress(event) {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (onPress) onPress(event);
  }

  function handleLongPress(event) {
    longPressFiredRef.current = true;
    onLongPress(event);
  }

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, PRESS_SCALE] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, PRESS_OPACITY] });

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={() => animateTo(0)}
      style={style}
      accessibilityRole={accessibilityRole}
      {...rest}
    >
      <Animated.View style={[contentStyle, { transform: [{ scale }], opacity }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
