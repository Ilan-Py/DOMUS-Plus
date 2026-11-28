import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';
import useReducedMotion from '../hooks/useReducedMotion';

// Casilla con etiqueta: caja y texto son un solo blanco táctil (mín. 48 px), pensado para
// que sea fácil de acertar. Para tildar y destildar alcanza con tocar cualquier parte de la fila.
// Al tildar, el check aparece con un "pop" corto (sin movimiento si el sistema pide reducirlo).
// `accessibilityLabel`: para cuando el texto visible va aparte (p. ej. con enlaces adentro).
export default function CheckboxField({ label, checked, onChange, style, accessibilityLabel }) {
  const reduceMotion = useReducedMotion();
  const pop = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) pop.setValue(checked ? 1 : 0);
    else Animated.spring(pop, { toValue: checked ? 1 : 0, bounciness: 10, speed: 20, useNativeDriver: true }).start();
  }, [checked, pop, reduceMotion]);

  return (
    <PressScale
      style={style}
      contentStyle={styles.row}
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ checked: !!checked }}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        <Animated.View style={{ opacity: pop, transform: [{ scale: pop }] }}>
          <Ionicons name="checkmark" size={20} color={colors.onAccent} />
        </Animated.View>
      </View>
      {!!label && <Text style={styles.label}>{label}</Text>}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderInput,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong },
  label: { flexShrink: 1, fontSize: 15, lineHeight: 22, color: colors.ink, fontFamily: poppinsWeight('500') },
});
