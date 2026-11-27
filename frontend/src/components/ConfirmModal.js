import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Platform, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import { paper } from '../theme/paper';
import useReducedMotion from '../hooks/useReducedMotion';
import PrimaryButton from './PrimaryButton';
import PressScale from './PressScale';
import StickerConfirm, { ACENTOS } from './StickerConfirm';

// Tarjeta de confirmación con estilo paper cutout, reutilizable: sticker arriba, título en la serif de la marca,
// texto secundario y botones, todo centrado. Variantes: 'logout' (puerta con flecha, terracota), 'danger' (tacho)
// e 'info' (círculo con "i", salvia). No dibuja el fondo ni abre nada por sí sola: la muestra DialogHost sobre su
// backdrop cuando se abre un diálogo con `variante` (ver utils/confirm.js → confirmarDestructivo / openDialog).
//   acciones: [{ label, variant: 'accent' | 'secondary', onPress }]   onElegir(accion): cierra y ejecuta
export default function ConfirmModal({ variante = 'info', titulo, mensaje, acciones = [], onElegir }) {
  const acento = ACENTOS[variante] || ACENTOS.info;
  const reduceMotion = useReducedMotion();
  const esWeb = Platform.OS === 'web';
  // Entrada paper-pop de 240 ms: en web la hace el CSS global (theme/paper.js); en nativo, un spring corto.
  const anim = useRef(new Animated.Value(esWeb || reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (esWeb) return;
    if (reduceMotion) {
      anim.setValue(1);
      return;
    }
    Animated.timing(anim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [anim, esWeb, reduceMotion]);
  const escala = anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  return (
    <Animated.View
      {...paper('popmodal')}
      style={[styles.card, { opacity: anim, transform: [{ scale: escala }] }]}
      accessibilityViewIsModal
      accessibilityRole="alert"
    >
      <View style={styles.sticker}>
        <StickerConfirm variante={variante} size={72} />
      </View>
      <Text style={styles.titulo} accessibilityRole="header">{titulo}</Text>
      {!!mensaje && <Text style={styles.mensaje}>{mensaje}</Text>}
      <View style={styles.acciones}>
        {acciones.map((a) =>
          a.variant === 'secondary' ? (
            <BotonSuave key={a.label} label={a.label} onPress={() => onElegir(a)} />
          ) : (
            <PrimaryButton
              key={a.label}
              title={a.label}
              variant={a.variant === 'accent' && variante === 'info' ? 'success' : a.variant || 'accent'}
              onPress={() => onElegir(a)}
              style={variante === 'danger' ? { backgroundColor: acento } : undefined}
            />
          )
        )}
      </View>
    </Animated.View>
  );
}

// Botón secundario: borde cálido suave (en vez del negro duro) y hover en arena.
function BotonSuave({ label, onPress }) {
  const [hover, setHover] = useState(false);
  return (
    <PressScale
      contentStyle={[styles.suave, hover && styles.suaveHover]}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityLabel={label}
    >
      <Text style={styles.suaveText}>{label}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 400,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: 'rgba(42, 36, 33, 0.08)',
    // Cartulina: sombra cálida suave (en web, de dos capas vía theme/paper.js).
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  sticker: { marginBottom: 16 },
  titulo: { fontSize: 26, lineHeight: 34, fontFamily: SERIF_BOLD, color: colors.ink, textAlign: 'center' },
  mensaje: { fontSize: 17, lineHeight: 25, color: colors.textBody, textAlign: 'center', marginTop: 8 },
  acciones: { alignSelf: 'stretch', gap: 12, marginTop: 24 },
  suave: {
    width: '100%',
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(42, 36, 33, 0.22)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suaveHover: { backgroundColor: '#F3EAE0' },
  suaveText: { fontSize: 17, fontFamily: poppinsWeight('600'), color: colors.ink },
});
