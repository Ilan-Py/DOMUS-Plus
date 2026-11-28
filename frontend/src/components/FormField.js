import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, Pressable } from 'react-native';
import CrossfadeIcon from './CrossfadeIcon';
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
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  inputRef,
  style,
  accesorio, // { texto, onPress }: enlace a la derecha del label (p. ej. «¿Olvidaste tu contraseña?»)
}) {
  const [focused, setFocused] = useState(false);
  // Contraseñas: botón visible Mostrar/Ocultar para revisar lo escrito.
  const [revealed, setRevealed] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View style={[styles.field, style]}>
      {accesorio ? (
        <View style={styles.labelFila}>
          <Text style={[styles.label, { marginBottom: 0 }]}>{label}</Text>
          <Pressable onPress={accesorio.onPress} accessibilityRole="link" accessibilityLabel={accesorio.texto} style={styles.accesorio}>
            <Text style={styles.accesorioTexto}>{accesorio.texto}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
      <View>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            multiline && styles.textarea,
            isPassword && styles.inputWithToggle,
            !!error && styles.inputError,
            focused && styles.inputFocused,
            webOutlineStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete ?? 'off'}
          spellCheck={keyboardType === 'email-address' || isPassword ? false : undefined}
          textContentType={textContentType}
          multiline={multiline}
          accessibilityLabel={label}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPassword && (
          <Pressable
            style={styles.toggle}
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <CrossfadeIcon a="eye-outline" b="eye-off-outline" showB={revealed} size={22} color={colors.ink} />
            <Text style={styles.toggleText}>{revealed ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        )}
      </View>
      {!!error && (
        <Text style={styles.fieldErrorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    paddingBottom: 20,
  },
  labelFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  accesorio: { minHeight: 44, justifyContent: 'center' },
  accesorioTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.accentStrong, textDecorationLine: 'underline' },
  label: {
    fontSize: 16,
    fontFamily: poppinsWeight('600'),
    color: colors.ink,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.input,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    backgroundColor: colors.glassFillStrong,
    fontSize: 16,
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
    borderColor: colors.accentStrong,
    // Halo suave en web (en nativo el borde ya marca el foco)
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 0 4px rgba(194, 70, 35, 0.12)' } : null),
  },
  inputWithToggle: {
    paddingRight: 112,
  },
  toggle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleText: {
    fontSize: 15,
    fontFamily: poppinsWeight('600'),
    color: colors.ink,
  },
  fieldErrorText: {
    fontSize: 14,
    color: colors.error,
    fontFamily: poppinsWeight('600'),
    marginTop: 8,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
