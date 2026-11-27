import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';
import FormField from './FormField';

// Selector de opciones con botones visibles (en vez de texto libre o un
// desplegable escondido): cada opción es un botón de 48dp que se ve completo,
// pensado también para personas mayores.
//
// Una sola elección (`multiple` falso): value es un string. Varias elecciones
// (`multiple`): value es un array de strings.
// `otherLabel` agrega un botón "Otro/Otra" que abre un campo para escribir
// cuál; lo escrito se guarda tal cual (no la palabra "Otro").
//
// `optional`: una opción elegida se puede volver a tocar para quitarla.
const OTHER = '__otro__';

function splitOthers(text) {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function OptionPicker({
  label,
  options,
  value,
  onChange,
  multiple = false,
  otherLabel,
  otherFieldLabel,
  otherPlaceholder,
  optional = true,
  error,
  style,
}) {
  const selected = multiple ? value || [] : value ? [value] : [];
  const known = selected.filter((v) => options.includes(v));
  const unknown = selected.filter((v) => !options.includes(v));

  const [otherActive, setOtherActive] = useState(unknown.length > 0);
  const [otherText, setOtherText] = useState(unknown.join(', '));

  function emit(nextKnown, nextOtherText, nextOtherActive) {
    if (multiple) {
      onChange([...nextKnown, ...(nextOtherActive ? splitOthers(nextOtherText) : [])]);
    } else {
      onChange(nextOtherActive ? nextOtherText.trim() : nextKnown[0] || '');
    }
  }

  function toggleOption(opt) {
    const isOn = known.includes(opt);
    if (multiple) {
      const next = isOn ? known.filter((k) => k !== opt) : [...known, opt];
      emit(next, otherText, otherActive);
      return;
    }
    // Una sola elección: elegir una opción apaga "Otro".
    setOtherActive(false);
    setOtherText('');
    if (isOn) {
      if (optional) onChange('');
    } else {
      onChange(opt);
    }
  }

  function toggleOther() {
    const next = !otherActive;
    setOtherActive(next);
    if (!multiple && next) {
      // Al pasar a "Otro", se descarta la opción de la lista.
      onChange(otherText.trim());
    } else {
      emit(known, otherText, next);
    }
  }

  function changeOther(text) {
    setOtherText(text);
    emit(known, text, true);
  }

  const chips = [
    ...options.map((opt) => ({ key: opt, label: opt, on: known.includes(opt), onPress: () => toggleOption(opt) })),
    ...(otherLabel
      ? [{ key: OTHER, label: otherLabel, on: otherActive, onPress: toggleOther }]
      : []),
  ];

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row} accessibilityRole={multiple ? undefined : 'radiogroup'}>
        {chips.map((c) => (
          <PressScale
            key={c.key}
            contentStyle={[styles.chip, c.on && styles.chipOn]}
            onPress={c.onPress}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: c.on, selected: c.on }}
            accessibilityLabel={c.label}
          >
            <Text style={[styles.chipText, c.on && styles.chipTextOn]}>
              {c.on ? '✓ ' : ''}
              {c.label}
            </Text>
          </PressScale>
        ))}
      </View>
      {otherActive && (
        <FormField
          label={otherFieldLabel || 'Escribí cuál'}
          value={otherText}
          onChangeText={changeOther}
          placeholder={otherPlaceholder}
          style={styles.other}
        />
      )}
      {!!error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { paddingBottom: 20 },
  label: {
    fontSize: 16,
    fontFamily: poppinsWeight('600'),
    color: colors.ink,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    backgroundColor: colors.glassFillStrong,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: {
    fontSize: 16,
    fontFamily: poppinsWeight('600'),
    color: colors.textBody,
  },
  chipTextOn: { color: colors.onAccent },
  other: { paddingTop: 12, paddingBottom: 0 },
  error: {
    fontSize: 14,
    color: colors.error,
    fontFamily: poppinsWeight('600'),
    marginTop: 8,
  },
});
