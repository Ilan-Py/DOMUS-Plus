import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, AccessibilityInfo, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';

// Aviso breve y cálido ("Vacuna guardada", "Código copiado"): borde fino, ícono de
// check en verde salvia y texto corto. Aparece unos segundos y se va solo.
// Se monta una vez (App.js) y se dispara con `mostrarToast('texto')` desde cualquier
// pantalla. Entrada sobria: opacidad y un desplazamiento corto, sin rebotes.
let listener = null;

export function mostrarToast(texto, tipo = 'ok') {
  if (listener) listener({ texto, tipo, id: Date.now() });
}

const DURACION_VISIBLE = 2600;
const DURACION_ANIM = 180;

export default function ToastHost() {
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const [sinMovimiento, setSinMovimiento] = useState(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
    listener = setToast;
    AccessibilityInfo.isReduceMotionEnabled().then(setSinMovimiento).catch(() => {});
    return () => {
      listener = null;
      clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    clearTimeout(timer.current);
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: sinMovimiento ? 0 : DURACION_ANIM,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: sinMovimiento ? 0 : DURACION_ANIM, useNativeDriver: true }).start(
        ({ finished }) => finished && setToast(null)
      );
    }, DURACION_VISIBLE);
  }, [toast, anim, sinMovimiento]);

  if (!toast) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [sinMovimiento ? 0 : 12, 0] });
  // En pantallas angostas queda sobre la barra inferior; en escritorio, abajo al centro del contenido.
  const bottom = width < 900 ? 96 : 32;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="none">
      <Animated.View
        style={[styles.toast, { opacity: anim, transform: [{ translateY }] }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Ionicons name={toast.tipo === 'error' ? 'alert-circle' : 'checkmark-circle'} size={24} color={toast.tipo === 'error' ? colors.error : '#7D9B76'} />
        <Text style={styles.text}>{toast.texto}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderCard,
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
    ...(Platform.OS === 'web' ? { maxWidth: 420 } : null),
  },
  text: { fontSize: 16, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.ink, flexShrink: 1 },
});
