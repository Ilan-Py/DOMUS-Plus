import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { paper } from '../theme/paper';
import useReducedMotion from '../hooks/useReducedMotion';
import EntityAvatar from './EntityAvatar';
import PressScale from './PressScale';
import { CATALOGO, OPCIONES } from './avatars/catalogo';

// Selector de avatar: vista previa grande (68 px) y una grilla de opciones táctiles (52 px, más que los 48
// mínimos). `mode`: 'all' (Mi cuenta: 12 opciones), 'person' (integrantes: 4×2) o 'pet' (mascotas: 4×2).
// El elegido lleva borde terracota de 2 px, un check en la esquina y una entrada paper-pop corta (sin
// movimiento con "reducir movimiento"). `value` es el id del catálogo o null (sin elegir → iniciales/huellita).
function Opcion({ id, seleccionada, onPress, name, apellido, type }) {
  const reduceMotion = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const primera = useRef(true);

  // Nativo: pop con spring al quedar elegida (en web lo hace el CSS global paper-pop).
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (Platform.OS === 'web' || !seleccionada || reduceMotion) return;
    escala.setValue(0.85);
    Animated.spring(escala, { toValue: 1, bounciness: 10, speed: 16, useNativeDriver: true }).start();
  }, [seleccionada, reduceMotion, escala]);

  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionada, selected: seleccionada }}
      accessibilityLabel={CATALOGO[id]?.label || id}
      contentStyle={styles.celda}
    >
      <Animated.View
        {...(seleccionada ? paper('pop') : {})}
        style={[styles.marco, seleccionada && styles.marcoOn, { transform: [{ scale: escala }] }]}
      >
        <EntityAvatar
          avatarId={id}
          type={type}
          name={name}
          apellido={apellido}
          size={44}
        />
        {seleccionada && (
          <View style={styles.check}>
            <Ionicons name="checkmark" size={12} color={colors.onAccent} />
          </View>
        )}
      </Animated.View>
    </PressScale>
  );
}

export default function AvatarPicker({ value = null, onChange, mode = 'all', name, apellido, tipo, label }) {
  const { width } = useWindowDimensions();
  const ids = OPCIONES[mode] || OPCIONES.all;
  const type = mode === 'pet' ? 'pet' : 'person';
  const columnas = mode === 'all' ? (width >= 600 ? 6 : 4) : 4;
  // Sin elegir equivale al fallback: iniciales (personas) o huellita (mascotas).
  const efectivo = value || (mode === 'pet' ? 'paw-default' : 'initials');
  const titulo = label || (mode === 'pet' ? 'Elegí un ícono para tu mascota' : mode === 'person' ? 'Elegí un ícono' : 'Elegí tu ícono');

  return (
    <View style={styles.root}>
      <View style={styles.previa}>
        <EntityAvatar avatarId={value} type={type} name={name} apellido={apellido} size={68} tipo={tipo} />
      </View>
      <Text style={styles.titulo}>{titulo}</Text>
      <View style={styles.grilla} accessibilityRole="radiogroup" accessibilityLabel={titulo}>
        {ids.map((id) => (
          <View key={id} style={{ width: `${100 / columnas}%` }}>
            <Opcion
              id={id}
              seleccionada={efectivo === id}
              onPress={() => onChange && onChange(id)}
              name={name}
              apellido={apellido}
              type={CATALOGO[id]?.categoria === 'mascota' ? 'pet' : 'person'}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', marginBottom: 20 },
  previa: { marginBottom: 8 },
  titulo: { fontSize: 15, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.textBody, marginBottom: 12 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', maxWidth: 440, alignSelf: 'center' },
  celda: { alignItems: 'center', justifyContent: 'center', minHeight: 56, paddingVertical: 2 },
  marco: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcoOn: { borderColor: colors.accentStrong },
  check: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accentStrong,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
