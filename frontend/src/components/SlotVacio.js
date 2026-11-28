import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';

// Casilla punteada para sumar algo que todavía no está (persona, mascota, perfil). El punteado se reserva para
// placeholders como este: las acciones reales usan botón o borde sólido.
export default function SlotVacio({ texto, icono = 'add', onPress }) {
  return (
    <PressScale contentStyle={estilos.slot} onPress={onPress} accessibilityLabel={texto}>
      <Ionicons name={icono} size={22} color={colors.textBody} />
      <Text style={estilos.texto}>{texto}</Text>
    </PressScale>
  );
}

const estilos = StyleSheet.create({
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(42, 36, 33, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  texto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.textBody },
});
