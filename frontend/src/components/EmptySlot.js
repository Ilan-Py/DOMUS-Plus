import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressScale from './PressScale';
import { color, texto, espacio, radio } from '../theme/tokens';

// Casilla para sumar algo que todavía no está: «+ Persona sin cuenta», «+ Mascota». Es el ÚNICO lugar de la app con
// borde punteado: el punteado significa «acá falta algo». Las acciones reales usan botón o borde sólido.
//
//   <EmptySlot texto="Persona sin cuenta" subtexto="Un nene, un abuelo…" icono="person-add-outline" onPress={…} />
export default function EmptySlot({ texto: etiqueta, subtexto, icono = 'add', onPress, alto = 72 }) {
  const [hover, setHover] = useState(false);
  return (
    <PressScale
      contentStyle={[estilos.slot, { minHeight: alto }, hover && estilos.hover]}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityLabel={subtexto ? `Agregar ${etiqueta}. ${subtexto}` : `Agregar ${etiqueta}`}
    >
      <Ionicons name={icono} size={22} color={hover ? color.terracotaTexto : color.texto} />
      <View style={estilos.textos}>
        <Text style={[texto.etiqueta, { color: hover ? color.terracotaTexto : color.texto }]}>{etiqueta}</Text>
        {!!subtexto && <Text style={[texto.meta, { color: color.texto }]}>{subtexto}</Text>}
      </View>
    </PressScale>
  );
}

const estilos = StyleSheet.create({
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio[2],
    paddingHorizontal: espacio[4],
    paddingVertical: espacio[3],
    borderRadius: radio.tarjeta,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(42, 36, 33, 0.3)',
    backgroundColor: 'rgba(255, 253, 249, 0.6)',
  },
  hover: { borderColor: color.terracota, backgroundColor: color.cartulina },
  textos: { alignItems: 'flex-start' },
});
