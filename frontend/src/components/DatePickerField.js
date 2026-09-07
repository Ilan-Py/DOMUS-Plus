import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radii } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';

function pad(n) {
  return String(n).padStart(2, '0');
}

// Siempre a partir de los getters locales (getFullYear/getMonth/getDate/
// getHours/getMinutes) — nunca toISOString(), que convierte a UTC y puede
// correr la fecha/hora un día u hora según el huso horario del dispositivo.
// Estos son el único lugar donde un Date se convierte al string que espera
// cada endpoint (AAAA-MM-DD o HH:mm).
export function formatDateOnly(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTimeOnly(date) {
  if (!date) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Sólo para el branch web: construye un Date local a partir del string que
// devuelve <input type="date">/<input type="time"> (siempre "AAAA-MM-DD" /
// "HH:mm"). Nunca new Date(string) directo — eso lo interpreta como UTC y
// puede correr el día. baseDate aporta el resto de los componentes (para
// time, la porción de fecha; para date, se ignora ya que llega completa).
function parseDateInputValue(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function parseTimeInputValue(str, baseDate) {
  if (!str) return null;
  const [h, min] = str.split(':').map(Number);
  const base = baseDate || new Date();
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, min, 0, 0);
}

// Mismo look que FormField (label/input/error) pero con un campo presionable
// que abre el picker nativo en vez de un TextInput. Android abre un diálogo
// modal que se cierra solo al elegir; iOS muestra una rueda inline que se
// cierra con el botón "Listo" — ambos casos manejados acá adentro.
export default function DatePickerField({
  label,
  value,
  onChange,
  mode = 'date',
  error,
  minimumDate,
  maximumDate,
  placeholder,
  style,
}) {
  const [showPicker, setShowPicker] = useState(false);

  // @react-native-community/datetimepicker no tiene implementación web —
  // en su lugar se usa el input nativo del navegador. Convierte a/desde
  // Date sólo en este borde; hacia afuera el componente sigue exponiendo
  // value: Date|null y onChange(date: Date) igual que en mobile, así
  // ninguna pantalla necesita saber que este branch existe.
  if (Platform.OS === 'web') {
    const inputValue = value
      ? mode === 'time'
        ? formatTimeOnly(value)
        : formatDateOnly(value)
      : '';

    function handleWebChange(e) {
      const raw = e.target.value;
      if (!raw) return;
      const parsed = mode === 'time' ? parseTimeInputValue(raw, value) : parseDateInputValue(raw);
      if (parsed) onChange(parsed);
    }

    return (
      <View style={[styles.field, style]}>
        <Text style={styles.label}>{label}</Text>
        <input
          type={mode === 'time' ? 'time' : 'date'}
          value={inputValue}
          onChange={handleWebChange}
          min={mode === 'date' && minimumDate ? formatDateOnly(minimumDate) : undefined}
          max={mode === 'date' && maximumDate ? formatDateOnly(maximumDate) : undefined}
          style={{ ...webInputStyle, ...(error ? webInputErrorStyle : null) }}
        />
        {!!error && <Text style={styles.fieldErrorText}>{error}</Text>}
      </View>
    );
  }

  function handleChange(event, selectedValue) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed') {
      return;
    }
    if (selectedValue) {
      onChange(selectedValue);
    }
  }

  const displayText = value
    ? mode === 'time'
      ? formatTimeOnly(value)
      : formatDateOnly(value)
    : placeholder || (mode === 'time' ? 'Seleccionar hora' : 'Seleccionar fecha');

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, !!error && styles.inputError]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>{displayText}</Text>
      </TouchableOpacity>
      {!!error && <Text style={styles.fieldErrorText}>{error}</Text>}

      {showPicker && (
        <>
          <DateTimePicker
            value={value || new Date()}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setShowPicker(false)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.doneBtnText}>Listo</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

// Mismo look que el `input`/`inputError` de abajo, expresado como estilo CSS
// plano (el <input> nativo web no pasa por StyleSheet.create).
const webInputStyle = {
  width: '100%',
  minHeight: 48,
  boxSizing: 'border-box',
  paddingLeft: 14,
  paddingRight: 14,
  paddingTop: 13,
  paddingBottom: 13,
  borderRadius: radii.input,
  border: `1.5px solid ${colors.line}`,
  backgroundColor: colors.glassFillStrong,
  fontSize: 15,
  color: colors.navy,
  fontFamily: 'inherit',
  outline: 'none',
};

const webInputErrorStyle = {
  borderColor: colors.error,
  backgroundColor: colors.errorBg,
};

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
    justifyContent: 'center',
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  valueText: {
    fontSize: 15,
    color: colors.navy,
  },
  placeholderText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  fieldErrorText: {
    fontSize: 12.5,
    color: colors.error,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    marginTop: 6,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.ink,
  },
});
