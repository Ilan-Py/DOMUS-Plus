import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Entrada escalonada para filas de lista (MemberCard/recordCard/reminder
// row) cuando los datos reales aparecen post-skeleton. `index` viene del
// propio .map()/renderItem — como cada fila mantiene su `key` estable entre
// renders, este mount-effect corre una sola vez cuando la fila aparece por
// primera vez, no en cada refetch (pull-to-refresh sobre datos ya
// renderizados no reanima nada, sólo una fila realmente nueva lo hace).
const DURATION = 220;
const STAGGER_STEP = 35;
// Cap para no hacer esperar de más a una fila #20 en una lista larga — a
// partir de acá todas arrancan juntas, la sensación de "cascada" ya se
// leyó en las primeras filas.
const STAGGER_CAP = 8;

export default function FadeSlideIn({ index = 0, style, children }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: DURATION,
      delay: Math.min(index, STAGGER_CAP) * STAGGER_STEP,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
