import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressScale from './PressScale';
import useReducedMotion from '../hooks/useReducedMotion';
import { MANUSCRITA } from '../theme/typography';
import { color, espacio, radio, tactil } from '../theme/tokens';

// Post-it de papel para NOTAS HUMANAS («No le gusta que le toquen las patas», «Come 300 g de balanceado»).
// Reglas (ronda de la libreta sanitaria):
//  - uno por tarjeta como máximo, pegado en una esquina, rotado entre −2° y 3°, con una tira de cinta washi;
//  - nunca datos críticos (dosis, vencimientos, alergias van en la UI normal);
//  - letra manuscrita sólo acá y grande; si la nota es larga se recorta y se abre al tocarla.
//
//   <PostIt texto={nota} onGuardar={async (t) => …} nombre="Bruno" />   sin texto muestra «+ Nota»
const COLORES = { mostaza: '#FBE7A8', rosa: '#F6D3CB' };
const MAX_LINEAS = 4;

export default function PostIt({ texto, onGuardar, nombre, tono = 'mostaza', giro = 2, style }) {
  const [editando, setEditando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState(texto || '');
  const [guardando, setGuardando] = useState(false);
  const reducir = useReducedMotion();
  const entrada = useRef(new Animated.Value(texto ? 1 : 0)).current;

  // Al pegar una nota nueva: cae y se acomoda (sutil; sin movimiento si el sistema lo pide).
  useEffect(() => {
    if (!texto) return;
    if (reducir) {
      entrada.setValue(1);
      return;
    }
    Animated.spring(entrada, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
  }, [texto, entrada, reducir]);

  async function guardar() {
    setGuardando(true);
    const ok = await onGuardar?.(borrador.trim());
    setGuardando(false);
    if (ok !== false) setEditando(false);
  }

  if (!texto && !editando) {
    return (
      <PressScale
        style={style}
        contentStyle={estilos.agregar}
        onPress={() => { setBorrador(''); setEditando(true); }}
        accessibilityLabel={`Agregar una nota sobre ${nombre} para quien la cuide`}
      >
        <Ionicons name="add" size={18} color="#7A5112" />
        <Text style={estilos.agregarTexto}>Nota</Text>
      </PressScale>
    );
  }

  const fondo = COLORES[tono] || COLORES.mostaza;
  const escala = entrada.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <Animated.View
      style={[
        estilos.papel,
        { backgroundColor: fondo, transform: [{ rotate: `${giro}deg` }, { scale: escala }], opacity: entrada },
        style,
      ]}
    >
      {/* Cinta washi arriba, un poco torcida */}
      <View pointerEvents="none" style={estilos.cinta} />
      {editando ? (
        <View style={estilos.editor}>
          <TextInput
            value={borrador}
            onChangeText={setBorrador}
            multiline
            autoFocus
            maxLength={500}
            placeholder={`Algo que conviene saber de ${nombre}…`}
            placeholderTextColor="#8A7B5A"
            style={estilos.input}
            accessibilityLabel={`Nota sobre ${nombre}`}
          />
          <View style={estilos.botones}>
            <PressScale contentStyle={estilos.boton} onPress={guardar} disabled={guardando} accessibilityLabel="Guardar la nota">
              <Text style={estilos.botonTexto}>{guardando ? 'Guardando…' : 'Pegar'}</Text>
            </PressScale>
            <PressScale contentStyle={estilos.boton} onPress={() => { setBorrador(texto || ''); setEditando(false); }} accessibilityLabel="Cancelar">
              <Text style={estilos.botonTexto}>Cancelar</Text>
            </PressScale>
            {!!texto && (
              <PressScale
                contentStyle={estilos.boton}
                onPress={async () => { setBorrador(''); setGuardando(true); const ok = await onGuardar?.(''); setGuardando(false); if (ok !== false) setEditando(false); }}
                accessibilityLabel="Despegar la nota"
              >
                <Text style={estilos.botonTexto}>Despegar</Text>
              </PressScale>
            )}
          </View>
        </View>
      ) : (
        <>
          <PressScale
            onPress={() => setAbierto((v) => !v)}
            accessibilityLabel={`Nota sobre ${nombre}: ${texto}`}
            accessibilityHint={abierto ? 'Tocá para achicarla' : 'Tocá para leerla entera'}
          >
            <Text style={estilos.texto} numberOfLines={abierto ? undefined : MAX_LINEAS}>{texto}</Text>
          </PressScale>
          <PressScale contentStyle={estilos.lapiz} onPress={() => { setBorrador(texto); setEditando(true); }} accessibilityLabel="Editar la nota">
            <Ionicons name="pencil" size={16} color="#7A5112" />
          </PressScale>
        </>
      )}
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  papel: {
    width: 220,
    minHeight: 120,
    paddingTop: espacio[5],
    paddingHorizontal: espacio[4],
    paddingBottom: espacio[3],
    borderRadius: 3,
    // Sombra de papel pegado: corta y sin difuminar.
    shadowColor: '#2A2421',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 0,
    elevation: 2,
    ...Platform.select({ web: { boxShadow: '2px 3px 0 rgba(42,36,33,0.14)' }, default: {} }),
  },
  cinta: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    left: 70,
    width: 80,
    height: 20,
    backgroundColor: 'rgba(194, 214, 203, 0.85)',
    transform: [{ rotate: '-4deg' }],
    borderRadius: 2,
  },
  texto: { fontFamily: MANUSCRITA, fontSize: 24, lineHeight: 28, color: '#3B3022' },
  lapiz: { position: 'absolute', right: 4, bottom: 4, width: tactil.minimo, height: tactil.minimo, alignItems: 'center', justifyContent: 'center' },
  editor: { gap: espacio[2] },
  input: { fontFamily: MANUSCRITA, fontSize: 22, lineHeight: 26, color: '#3B3022', minHeight: 80, textAlignVertical: 'top', ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }) },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[1] },
  boton: { minHeight: tactil.minimo, paddingHorizontal: espacio[2], justifyContent: 'center' },
  botonTexto: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#7A5112', textDecorationLine: 'underline' },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: tactil.minimo,
    paddingHorizontal: espacio[3],
    borderRadius: radio.etiqueta,
    backgroundColor: COLORES.mostaza,
    transform: [{ rotate: '-2deg' }],
  },
  agregarTexto: { fontFamily: MANUSCRITA, fontSize: 22, color: '#7A5112' },
});
