import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { colors, radii } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';

// RN Web nunca aplica outline:none al <input>/<textarea> subyacente de
// TextInput, así que al enfocar un campo aparece el anillo azul de foco por
// default del navegador encima del fondo glass — se apaga sólo en web (ver
// DatePickerField.webInputStyle, que hace lo mismo sobre su <input> crudo) y
// se reemplaza por inputFocused más abajo para no perder la señal de foco.
const webOutlineStyle = Platform.select({
  web: { outlineStyle: 'none' },
  default: {},
});

// Unifica el patrón label + input + error inline duplicado en
// LoginScreen, RegisterScreen, GroupSetupScreen y AddMemberScreen.
// `error` acepta cualquier string truthy (mensaje del backend o uno fijo
// como "Este campo es obligatorio"); falsy = sin error.
export default function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  style,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.textarea,
          !!error && styles.inputError,
          focused && styles.inputFocused,
          webOutlineStyle,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {!!error && <Text style={styles.fieldErrorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    paddingBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: radii.input,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.glassFillStrong,
    fontSize: 15,
    color: colors.navy,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  // Reemplaza el anillo de foco nativo del navegador (apagado en web vía
  // webOutlineStyle) — visible para navegación por teclado/lectores de
  // pantalla igual que el outline que reemplaza.
  inputFocused: {
    borderWidth: 2,
    borderColor: colors.limeDeep,
  },
  fieldErrorText: {
    fontSize: 12.5,
    color: colors.error,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    marginTop: 6,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
