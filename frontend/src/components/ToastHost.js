import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressScale from './PressScale';
import useReducedMotion from '../hooks/useReducedMotion';
import { color, texto, espacio, radio, tactil, movimiento } from '../theme/tokens';

// Avisos breves («Vacuna guardada», «No pudimos conectarnos…»). Se monta una vez en App.js y se dispara desde
// cualquier pantalla:
//
//   mostrarToast('Vacuna guardada')                                   → ok
//   mostrarToast('No pudimos guardar. Probá de nuevo.', 'error')      → error (compatibilidad con la firma vieja)
//   mostrarToast('Dosis marcada como dada', { accion: { etiqueta: 'Deshacer', onPress: deshacer } })
//
// tipo: 'ok' | 'error' | 'info'. Los errores no se van solos: tienen «Cerrar» (y se anuncian de forma asertiva).
// La duración depende del largo (≈ 1 s cada 4 palabras, mínimo 4 s; 8 s si hay una acción para que dé tiempo).
let listener = null;

export function mostrarToast(textoAviso, opciones) {
  const o = typeof opciones === 'string' ? { tipo: opciones } : opciones || {};
  if (listener) listener({ texto: textoAviso, tipo: o.tipo || 'ok', accion: o.accion || null, duracion: o.duracion, id: Date.now() });
}

export function duracionDe({ texto: t = '', accion, tipo }) {
  if (tipo === 'error') return null; // queda hasta que se cierra
  const palabras = t.trim().split(/\s+/).length;
  return Math.max(accion ? 8000 : 4000, Math.round((palabras / 4) * 1000) + 1500);
}

const TIPOS = {
  ok: { icono: 'checkmark', sello: color.salvia },
  error: { icono: 'alert', sello: color.terracota },
  info: { icono: 'information', sello: color.tinta },
};

// Presentación pura (la usa /styleguide para mostrar las variantes sin dispararlas).
export function Toast({ texto: textoAviso, tipo = 'ok', accion, onCerrar, style }) {
  const t = TIPOS[tipo] || TIPOS.ok;
  return (
    <View
      style={[estilos.toast, style]}
      accessibilityRole={tipo === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={tipo === 'error' ? 'assertive' : 'polite'}
      {...(Platform.OS === 'web' && tipo !== 'error' ? { role: 'status' } : null)}
    >
      <View style={[estilos.sello, { backgroundColor: t.sello }]}>
        <Ionicons name={t.icono} size={18} color={color.sobreColor} />
      </View>
      <Text style={[texto.etiqueta, estilos.texto]}>{textoAviso}</Text>
      {!!accion && (
        <PressScale contentStyle={estilos.accion} onPress={accion.onPress} accessibilityLabel={accion.etiqueta}>
          <Text style={[texto.etiqueta, estilos.accionTexto]}>{accion.etiqueta}</Text>
        </PressScale>
      )}
      {tipo === 'error' && !!onCerrar && (
        <PressScale contentStyle={estilos.cerrar} onPress={onCerrar} accessibilityLabel="Cerrar aviso">
          <Ionicons name="close" size={20} color={color.texto} />
        </PressScale>
      )}
    </View>
  );
}

export default function ToastHost() {
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const sinMovimiento = useReducedMotion();
  const { width } = useWindowDimensions();

  useEffect(() => {
    listener = setToast;
    return () => {
      listener = null;
      clearTimeout(timer.current);
    };
  }, []);

  function ocultar() {
    clearTimeout(timer.current);
    Animated.timing(anim, { toValue: 0, duration: sinMovimiento ? 0 : movimiento.base, useNativeDriver: true }).start(
      ({ finished }) => finished && setToast(null)
    );
  }

  useEffect(() => {
    if (!toast) return;
    clearTimeout(timer.current);
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: sinMovimiento ? 0 : movimiento.lento,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const ms = toast.duracion ?? duracionDe(toast);
    if (ms) timer.current = setTimeout(ocultar, ms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, anim, sinMovimiento]);

  if (!toast) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [sinMovimiento ? 0 : 12, 0] });
  // En pantallas angostas queda sobre la barra inferior; en escritorio, abajo al centro del contenido.
  const bottom = width < 900 ? 96 : 32;
  const accion = toast.accion
    ? {
        etiqueta: toast.accion.etiqueta,
        onPress: () => {
          ocultar();
          toast.accion.onPress?.();
        },
      }
    : null;

  return (
    <View style={[estilos.wrap, { bottom }]} pointerEvents="box-none">
      <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
        <Toast texto={toast.texto} tipo={toast.tipo} accion={accion} onCerrar={ocultar} />
      </Animated.View>
    </View>
  );
}

const estilos = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: espacio[6],
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[3],
    minHeight: 52,
    paddingLeft: espacio[5],
    paddingRight: espacio[3],
    paddingVertical: espacio[2],
    // Etiqueta de papel: cartulina sin borde, esquinas poco redondeadas y sombra dura apilada.
    borderRadius: radio.etiqueta,
    backgroundColor: color.cartulina,
    shadowColor: '#2B211C',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 0,
    elevation: 6,
    ...(Platform.OS === 'web' ? { maxWidth: 480 } : null),
  },
  sello: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  texto: { color: color.tinta, flexShrink: 1, fontSize: 16, lineHeight: 22 },
  accion: { minHeight: tactil.minimo, paddingHorizontal: espacio[3], borderRadius: radio.control, justifyContent: 'center' },
  accionTexto: { color: color.terracotaTexto, textDecorationLine: 'underline' },
  cerrar: { width: tactil.minimo, height: tactil.minimo, borderRadius: radio.control, alignItems: 'center', justifyContent: 'center' },
});
