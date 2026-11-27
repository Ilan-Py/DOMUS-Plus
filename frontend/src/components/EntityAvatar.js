import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Avatar from './Avatar';
import { arteDe } from './avatars/catalogo';

// Avatar de usuario, integrante o mascota con estética de recorte de papel: borde blanco de 3 px y sombra
// cálida corta. Si hay un `avatarId` del catálogo, dibuja ese SVG. Si es null: foto (si la hay) o, por
// defecto, las iniciales (type="person") o la huellita verde salvia (type="pet"). "initials" y
// "paw-default" fuerzan ese fallback aunque haya foto.
//   type: 'person' | 'pet'      name/apellido: para las iniciales      tipo: 'adulto'|'menor'|'mayor'
export default function EntityAvatar({ avatarId = null, type = 'person', name, apellido, size = 48, fotoUrl, tipo }) {
  const arte = avatarId && avatarId !== 'initials' && avatarId !== 'paw-default' ? arteDe(avatarId) : null;
  const sinFoto = avatarId === 'initials' || avatarId === 'paw-default';
  const aro = size >= 40 ? 3 : 2;
  const interior = size - aro * 2;

  return (
    <View style={[styles.sombra, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[styles.aro, { width: size, height: size, borderRadius: size / 2, borderWidth: aro }]}>
        {arte ? (
          <Svg width={interior} height={interior} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no">
            <Rect x={0} y={0} width={100} height={100} fill={arte.bg} />
            {arte.el}
          </Svg>
        ) : (
          <Avatar
            nombre={name}
            apellido={apellido}
            size={interior}
            mascota={type === 'pet'}
            tipo={tipo}
            fotoUrl={sinFoto ? undefined : fotoUrl}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sombra cálida corta (rgba(42, 36, 33, 0.10)); en web, de dos capas.
  sombra: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    ...Platform.select({ web: { boxShadow: '0 1px 2px rgba(42, 36, 33, 0.10), 0 3px 6px rgba(42, 36, 33, 0.10)' }, default: {} }),
  },
  aro: { overflow: 'hidden', borderColor: '#FFFFFF', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
