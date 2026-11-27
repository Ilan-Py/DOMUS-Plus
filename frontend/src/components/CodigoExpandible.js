import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { colors, radii } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import useReducedMotion from '../hooks/useReducedMotion';
import PressScale from './PressScale';
import FormField from './FormField';
import PrimaryButton from './PrimaryButton';
import CrossfadeIcon from './CrossfadeIcon';

// "Expand the same element": el botón "Unirme con un código de invitación" se despliega ahí mismo
// en el campo del código, en vez de mandar a otra pantalla — la persona no pierde el contexto.
// El contenido se mide una vez y la altura se anima (220 ms); al cerrar se desmonta para que el
// campo no quede en el orden del teclado. Con "reducir movimiento" abre y cierra al instante.
export default function CodigoExpandible({ onContinuar }) {
  const reduceMotion = useReducedMotion();
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [alto, setAlto] = useState(0);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const h = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (abierto) setMontado(true);
  }, [abierto]);

  useEffect(() => {
    if (abierto && alto === 0) return; // esperando la primera medida
    Animated.timing(h, {
      toValue: abierto ? alto : 0,
      duration: reduceMotion ? 0 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !abierto) setMontado(false);
    });
  }, [abierto, alto, reduceMotion, h]);

  function continuar() {
    if (!codigo.trim()) {
      setError('Escribí el código que te pasaron.');
      return;
    }
    onContinuar(codigo.trim());
  }

  const opacidad = h.interpolate({ inputRange: [0, Math.max(alto, 1)], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={styles.caja}>
      <PressScale
        contentStyle={styles.cabecera}
        onPress={() => setAbierto((a) => !a)}
        accessibilityRole="button"
        accessibilityLabel="Unirme con un código de invitación"
        accessibilityState={{ expanded: abierto }}
      >
        <Text style={styles.titulo}>Unirme con un código de invitación</Text>
        <CrossfadeIcon a="chevron-down" b="chevron-up" showB={abierto} size={22} color={colors.ink} />
      </PressScale>

      <Animated.View style={{ height: h, opacity: opacidad, overflow: 'hidden' }}>
        {montado && (
          <View style={styles.contenido} onLayout={(e) => setAlto(Math.ceil(e.nativeEvent.layout.height))}>
            <Text style={styles.ayuda}>Primero creás tu cuenta y después te unís al grupo con este código.</Text>
            <FormField
              label="Código de invitación"
              value={codigo}
              onChangeText={(t) => {
                setCodigo(t.toUpperCase());
                if (t.trim()) setError('');
              }}
              placeholder="Ej. AB12CD…"
              autoCapitalize="characters"
              error={error}
              returnKeyType="go"
              onSubmitEditing={continuar}
              style={styles.campo}
            />
            <PrimaryButton title="Continuar y crear mi cuenta" variant="accent" onPress={continuar} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    borderRadius: radii.control,
    borderWidth: 2,
    borderColor: colors.borderWarm,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  cabecera: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titulo: { flex: 1, fontSize: 17, fontFamily: poppinsWeight('600'), color: colors.ink, textAlign: 'center' },
  contenido: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 16 },
  ayuda: { fontSize: 15, lineHeight: 22, color: colors.textBody, marginBottom: 12 },
  campo: { paddingBottom: 16 },
});
