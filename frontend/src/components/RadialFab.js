import React, { useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import Blob from './Blob';

// Mismo timing que PressScale (100ms, scale+nativeDriver) — no se reusa el
// componente en sí porque acá el Pressable ya tiene onPress/onLongPress con
// lógica propia (guard de longPressFiredRef, apertura/cierre del menú) que
// PressScale no expone; se agrega el mismo par onPressIn/onPressOut a mano.
const PRESS_FEEDBACK_SCALE = 0.94;
const PRESS_FEEDBACK_DURATION = 100;

// Excepción deliberada y acotada a este menú: el resto de la app es flat
// (migración hogareño), pero un menú radial flotante y efímero — aparece con
// un long-press, vive un instante, desaparece — es un lugar razonable para
// vidrio real, sin que sea una reversión general. Mismo patrón que tenían
// Login/Register antes de aplanarse: BlurView nativo / backdropFilter en
// web, detrás de un color base semi-transparente (no sólido) encima — sólo
// que acá el color de arriba es el blob SVG en vez de un View rectangular.
const webBubbleBlurStyle = Platform.select({
  web: { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' },
  default: {},
});

// Mismo alpha que sageTranslucent (track de SegmentedControl) — alpha
// establecido en la app para "tinte semi-transparente sobre blur real", no
// un valor nuevo inventado acá.
const BUBBLE_TINT_ALPHA = 0.55;

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Spring con un toque de rebote (bounciness 4, no 0 como en SegmentedControl)
// — ahí se quería "sin overshoot" para no ensuciar la lectura de un texto
// deslizando; acá el pop-out es un gesto lúdico/táctil (menú estilo Sims),
// un poquito de rebote lo hace sentir más "vivo" sin llegar a ser exagerado.
const SPRING_CONFIG = { bounciness: 4, speed: 20, useNativeDriver: true };

// El FAB vive en la esquina inferior derecha en las tres pantallas que lo
// usan — el único cuadrante con espacio real antes de chocar con un borde de
// pantalla es hacia arriba-izquierda, así que las dos opciones se acomodan
// en un arco corto entre "izquierda" y "arriba", no en un círculo completo.
const OPTION_OFFSETS = [
  { x: -74, y: -10 },
  { x: -44, y: -76 },
];

function OptionBubble({ option, anim, offset, size, open }) {
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, offset.x] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, offset.y] });
  const pressAnim = useRef(new Animated.Value(0)).current;

  function animatePressTo(toValue) {
    Animated.timing(pressAnim, { toValue, duration: PRESS_FEEDBACK_DURATION, useNativeDriver: true }).start();
  }

  const pressScale = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, PRESS_FEEDBACK_SCALE] });

  return (
    <Animated.View
      // 'none' cuando el menú está cerrado — closeMenu() anima anim a 0 pero
      // hasta ahí las burbujas seguían montadas en su posición replegada
      // (translateX/Y interpolados a 0, superpuestas al botón principal) y
      // 'box-none' dejaba que su Pressable interno siguiera interceptando
      // toques ahí encima aunque fueran invisibles/escala 0. El cierre por
      // tap-afuera (Pressable absoluteFill, ver más abajo) no depende de
      // esto — sólo existe mientras open es true.
      pointerEvents={open ? 'box-none' : 'none'}
      style={[
        styles.optionWrap,
        {
          width: size,
          height: size,
          opacity: anim,
          transform: [{ translateX }, { translateY }, { scale: anim }],
        },
      ]}
    >
      <Pressable
        onPress={option.onPress}
        onPressIn={() => animatePressTo(1)}
        onPressOut={() => animatePressTo(0)}
        style={styles.optionPressable}
        accessibilityRole="button"
        accessibilityLabel={option.label}
      >
        <Animated.View style={[styles.optionPressable, { transform: [{ scale: pressScale }] }]}>
          {/* Capa de vidrio detrás del blob — recortada a un círculo del
              tamaño de la burbuja (aproximación al contorno orgánico real del
              blob, ver Blob más abajo: no hay forma simple de recortar un
              BlurView nativo al path SVG exacto). El blob semi-transparente
              de abajo se pinta ENCIMA de esta capa, no al revés — así el
              tinte de color queda sobre el vidrio, no debajo. */}
          {Platform.OS === 'web' ? (
            <View
              style={[StyleSheet.absoluteFill, webBubbleBlurStyle, { borderRadius: size / 2 }]}
            />
          ) : (
            <BlurView
              intensity={30}
              tint="light"
              style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]}
            />
          )}
          <Blob
            size={size}
            color={hexToRgba(option.bg, BUBBLE_TINT_ALPHA)}
            extraStyle={[StyleSheet.absoluteFill, shadow, styles.optionShadow]}
          />
          <Ionicons name={option.icon} size={20} color={option.fg} />
        </Animated.View>
      </Pressable>
      <Text style={styles.optionLabel} numberOfLines={1}>
        {option.label}
      </Text>
    </Animated.View>
  );
}

// FAB "blob" con menú radial estilo Sims. Tap corto -> `onPress` (la acción
// principal de siempre, ej. ir directo a AddReminder). Long-press -> abre
// `options` (hasta 2), que aparecen desde el blob con spring y se acomodan
// en OPTION_OFFSETS. Tocar una opción navega y cierra; tocar afuera o el
// blob de nuevo cierra sin navegar.
export default function RadialFab({ onPress, options, style, size = 64, optionSize = 52 }) {
  const [open, setOpen] = useState(false);
  const anims = useRef((options || []).map(() => new Animated.Value(0))).current;
  const mainPressAnim = useRef(new Animated.Value(0)).current;

  function animateMainPressTo(toValue) {
    Animated.timing(mainPressAnim, { toValue, duration: PRESS_FEEDBACK_DURATION, useNativeDriver: true }).start();
  }

  const mainPressScale = mainPressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, PRESS_FEEDBACK_SCALE] });

  // Pressable dispara onPress en el release incluso después de un long-press
  // que ya calificó — sin este flag, soltar un long-press también ejecutaría
  // handleMainPress (cerrando el menú recién abierto, o peor, disparando la
  // acción principal). Se resetea apenas se consume una vez.
  const longPressFiredRef = useRef(false);

  function openMenu() {
    longPressFiredRef.current = true;
    setOpen(true);
    Animated.stagger(
      40,
      anims.map((a) => Animated.spring(a, { toValue: 1, ...SPRING_CONFIG }))
    ).start();
  }

  function closeMenu(after) {
    Animated.stagger(
      30,
      [...anims].reverse().map((a) => Animated.spring(a, { toValue: 0, ...SPRING_CONFIG }))
    ).start(() => {
      setOpen(false);
      if (after) after();
    });
  }

  const hasOptions = !!(options && options.length);

  // Si no hay una acción directa para el tap corto (ej. ProfileDetailScreen
  // en la tab Historial, donde ningún destino "obvio" corresponde), un tap
  // simple abre el mismo menú que el long-press en vez de no hacer nada.
  function handleMainPress() {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (open) {
      closeMenu();
      return;
    }
    if (onPress) {
      onPress();
    } else if (hasOptions) {
      openMenu();
    }
  }

  return (
    <>
      {open && <Pressable style={StyleSheet.absoluteFill} onPress={() => closeMenu()} />}

      <View style={[styles.wrap, { width: size, height: size }, style]}>
        {hasOptions &&
          options.map((opt, i) => (
            <OptionBubble
              key={opt.key}
              option={{ ...opt, onPress: () => closeMenu(opt.onPress) }}
              anim={anims[i]}
              offset={OPTION_OFFSETS[i] || { x: 0, y: -80 }}
              size={optionSize}
              open={open}
            />
          ))}

        <Pressable
          onPress={handleMainPress}
          onLongPress={hasOptions ? openMenu : undefined}
          onPressIn={() => animateMainPressTo(1)}
          onPressOut={() => animateMainPressTo(0)}
          delayLongPress={280}
          style={styles.mainPressable}
          accessibilityRole="button"
          accessibilityLabel="Agregar"
        >
          <Animated.View style={[styles.mainPressable, { transform: [{ scale: mainPressScale }] }]}>
            <Blob size={size} color={colors.ink} extraStyle={[StyleSheet.absoluteFill, shadow]} />
            <Text style={styles.mainIcon}>+</Text>
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainIcon: {
    fontSize: 28,
    color: colors.onAccent,
    lineHeight: 30,
  },
  optionWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  optionPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionShadow: {
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  optionLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.ink,
    backgroundColor: colors.bgBase,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
