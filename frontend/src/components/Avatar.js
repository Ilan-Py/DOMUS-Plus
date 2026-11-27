import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { poppinsWeight } from '../theme/typography';
import { avatarTint } from '../theme/avatars';
import { iniciales } from '../utils/displayFormat';
import { API_URL } from '../config/env';

// Avatar circular: foto de perfil si el integrante o la mascota la tiene (`fotoUrl`, una
// ruta como /fotos/moni.jpg que sirve el backend); si no hay foto, o no se pudo cargar, las
// iniciales (personas) o la huella (mascotas) sobre el tinte pastel de su categoría.
// `tipo` es el tipo de integrante ('adulto' | 'menor' | 'mayor').
export default function Avatar({ nombre, apellido, size = 48, mascota = false, tipo = 'adulto', fotoUrl }) {
  const tinte = avatarTint(mascota ? 'mascota' : tipo);
  const ini = mascota ? '' : iniciales(nombre, apellido);
  const [fallo, setFallo] = useState(false);
  const uri = fotoUrl && !fallo ? (fotoUrl.startsWith('/') ? `${API_URL}${fotoUrl}` : fotoUrl) : null;

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tinte.bg },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
          onError={() => setFallo(true)}
          accessibilityLabel={`Foto de ${nombre || 'perfil'}`}
        />
      ) : ini ? (
        <Text style={[styles.text, { color: tinte.text, fontSize: size * 0.36 }]}>{ini}</Text>
      ) : (
        <Ionicons name={mascota ? 'paw' : 'person'} size={size * 0.48} color={tinte.text} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  text: { fontFamily: poppinsWeight('700'), letterSpacing: 0.5 },
});
