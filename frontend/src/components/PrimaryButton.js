import React from 'react';
import { Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radii, shadow, buttonColors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';

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
  disabled,
  variant = 'primary',
  fullWidth = true,
}) {
  const variantStyle = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = !!disabled || !!loading;

  return (
    <PressScale
      contentStyle={[
        styles.btn,
        !fullWidth && styles.btnAuto,
        variantStyle.container,
        isDisabled && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
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
