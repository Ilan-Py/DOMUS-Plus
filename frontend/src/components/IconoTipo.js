import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { tipoEvento } from '../theme/tokens';

// Ícono del tipo de evento: pastilla (medicación), jeringa (vacuna), estetoscopio (turno o control). Mismo set y
// mismo grosor en toda la app. Regla: ícono + color, nunca uno solo de los dos (el color solo no alcanza con
// daltonismo o baja visión), y siempre con el nombre del tipo al lado o en el label del contenedor.
//
//   <IconoTipo tipo="vacuna" />                     ícono suelto, color del tipo
//   <IconoTipo tipo="vacuna" circulo size={20} />   en un círculo del color de fondo del tipo (agenda, listas)
export const ICONO_TIPO = { medicacion: 'pill', vacuna: 'needle', control: 'stethoscope' };

export default function IconoTipo({ tipo, size = 18, circulo = false, diametro, color: colorPropio, style }) {
  const t = tipoEvento[tipo] || tipoEvento.control;
  const icono = <MaterialCommunityIcons name={ICONO_TIPO[tipo] || ICONO_TIPO.control} size={size} color={colorPropio || t.texto} />;
  if (!circulo) return icono;
  const d = diametro || Math.round(size * 2.1);
  return (
    <View
      style={[{ width: d, height: d, borderRadius: d / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.fondo }, style]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {icono}
    </View>
  );
}

// Insignia de pata sobre el avatar de una mascota (los eventos de mascotas se reconocen sin leer el nombre).
export function InsigniaMascota({ size = 14 }) {
  return (
    <View
      style={{ position: 'absolute', right: -3, bottom: -3, width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, backgroundColor: '#FFFDF9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E4D6C6' }}
      accessibilityLabel="Mascota"
    >
      <MaterialCommunityIcons name="paw" size={size - 2} color="#4A6B5D" />
    </View>
  );
}
