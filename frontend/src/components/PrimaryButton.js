import React, { useEffect, useRef } from 'react';
import { Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow, buttonColors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';

// Mismo spring "con rebote" que RadialFab (bounciness 4, speed 20) — un
// checkmark apareciendo es el mismo tipo de momento "algo aparece", no el
// spring "sin overshoot" que usa SegmentedControl para deslizar texto.
const CHECK_SPRING = { bounciness: 4, speed: 20, useNativeDriver: true };

function SuccessCheck({ color }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, ...CHECK_SPRING }).start();
  }, [anim]);

  return (
    <Animated.View style={{ transform: [{ scale: anim }] }}>
      <Ionicons name="checkmark" size={22} color={color} />
    </Animated.View>
  );
}

// Unifica btnPrimary (Login/Register), btnSuccess (GroupSetup/AddMember) y
// btnSecondary (AddMember "Cancelar") junto con el patrón saving/spinner
// duplicado en las tres pantallas de auth.
const VARIANTS = {
  primary: {
    container: { backgroundColor: colors.blueDeep, ...shadow },
    text: { color: colors.onAccent },
  },
  success: {
    container: { backgroundColor: buttonColors.success, ...shadow },
    text: { color: colors.onAccent },
  },
  accent: {
    container: { backgroundColor: buttonColors.accent, ...shadow },
    text: { color: colors.ink }, // negro sobre lime, no blanco — contraste
  },
  secondary: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.ink,
    },
    text: { color: colors.ink },
  },
  danger: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.limeDeep,
    },
    text: { color: colors.limeDeep },
  },
};

export default function PrimaryButton({
  title,
  onPress,
  loading,
  success,
  disabled,
  variant = 'primary',
  fullWidth = true,
}) {
  const variantStyle = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = !!disabled || !!loading || !!success;
  // El dimming (opacity 0.6) es una señal de "no disponible todavía"
  // (cargando/deshabilitado) — no aplica al estado de éxito, que debe verse
  // a pleno mientras se muestra el check.
  const showDimmed = (!!disabled || !!loading) && !success;

  return (
    <PressScale
      contentStyle={[
        styles.btn,
        !fullWidth && styles.btnAuto,
        variantStyle.container,
        showDimmed && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {success ? (
        <SuccessCheck color={variantStyle.text.color} />
      ) : loading ? (
        <ActivityIndicator color={variantStyle.text.color} />
      ) : (
        <Text style={[styles.btnText, variantStyle.text]}>{title}</Text>
      )}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAuto: {
    width: 'auto',
    alignSelf: 'flex-start',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    // '700'/Bold leía demasiado pesado contra el look más liviano del
    // rediseño — '600'/SemiBold sigue siendo legible a 15px y aligera el peso visual.
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    fontSize: 15,
  },
});
