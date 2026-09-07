import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Feedback de salida para una fila que se está borrando/desactivando —
// opacity+scale (ambos nativeDriver), NO height-collapse. Se evaluó
// colapsar la altura para que la lista "se cierre" alrededor del hueco,
// pero eso pide medir el alto real con onLayout y animarlo fuera del
// nativeDriver (height no es una transform-property) — jank real en el
// hilo de JS a cambio de una mejora cosmética marginal sobre lo que ya
// logra el fade+scale solo. Se dejó afuera a propósito en esta pasada.
//
// El screen que usa esto es responsable de la coreografía: marcar `exiting`
// true y esperar EXIT_DURATION (con un setTimeout, no un callback acá)
// antes de disparar el refetch real — así la fila ya está invisible cuando
// el array subyacente la pierde, sin necesidad de reconciliar "el ítem
// desapareció pero yo lo sigo pintando".
export const EXIT_DURATION = 180;

export default function FadeOutRow({ exiting, style, children }) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!exiting) return;
    Animated.timing(anim, { toValue: 0, duration: EXIT_DURATION, useNativeDriver: true }).start();
  }, [exiting, anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}
