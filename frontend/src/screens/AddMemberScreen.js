import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, radii, shadow, buttonColors } from '../theme/colors';

const TIPOS_INTEGRANTE = ['Adulto', 'Menor', 'Mayor'];

export default function AddMemberScreen({ navigation }) {
  const [tipoMiembro, setTipoMiembro] = useState('integrante'); // 'integrante' | 'mascota'
  const [nombre, setNombre] = useState('');
  const [nombreError, setNombreError] = useState(false);

  // Campos de integrante
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [tipoIntegrante, setTipoIntegrante] = useState('Adulto');
  const [observaciones, setObservaciones] = useState('');

  // Campos de mascota
  const [especie, setEspecie] = useState('');
  const [raza, setRaza] = useState('');

  function handleGuardar() {
    if (!nombre.trim()) {
      setNombreError(true);
      return;
    }
    // TODO: conectar con POST /api/familia/integrantes o /api/familia/mascotas
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Agregar a la familia</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segItem, tipoMiembro === 'integrante' && styles.segItemActive]}
            onPress={() => setTipoMiembro('integrante')}
          >
            <Text
              style={[
                styles.segItemText,
                tipoMiembro === 'integrante' && styles.segItemTextActive,
              ]}
            >
              Persona
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segItem, tipoMiembro === 'mascota' && styles.segItemActive]}
            onPress={() => setTipoMiembro('mascota')}
          >
            <Text
              style={[
                styles.segItemText,
                tipoMiembro === 'mascota' && styles.segItemTextActive,
              ]}
            >
              Mascota
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={[styles.input, nombreError && styles.inputError]}
            value={nombre}
            onChangeText={(text) => {
              setNombre(text);
              if (text.trim()) setNombreError(false);
            }}
            placeholder="Ej. Roberto Pérez"
            placeholderTextColor={colors.textMuted}
          />
          {nombreError && (
            <Text style={styles.fieldErrorText}>Este campo es obligatorio</Text>
          )}
        </View>

        {tipoMiembro === 'integrante' ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Fecha de nacimiento</Text>
              <TextInput
                style={styles.input}
                value={fechaNacimiento}
                onChangeText={setFechaNacimiento}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.chipRow}>
                {TIPOS_INTEGRANTE.map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[styles.chip, tipoIntegrante === tipo && styles.chipActive]}
                    onPress={() => setTipoIntegrante(tipo)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        tipoIntegrante === tipo && styles.chipTextActive,
                      ]}
                    >
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Observaciones</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={observaciones}
                onChangeText={setObservaciones}
                placeholder="Alergias, condiciones, notas..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Especie</Text>
              <TextInput
                style={styles.input}
                value={especie}
                onChangeText={setEspecie}
                placeholder="Perro, gato, ave..."
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Raza</Text>
              <TextInput
                style={styles.input}
                value={raza}
                onChangeText={setRaza}
                placeholder="Opcional"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </>
        )}

        <View style={styles.formActions}>
          <TouchableOpacity style={styles.btnSuccess} onPress={handleGuardar} activeOpacity={0.85}>
            <Text style={styles.btnSuccessText}>Guardar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.btnSecondaryText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: 'rgba(156,201,255,0.25)',
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  backBtnIcon: {
    fontSize: 22,
    color: colors.navy,
  },
  topbarTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: colors.navy,
  },
  scroll: {
    paddingBottom: 40,
  },
  segmented: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: 16,
    marginBottom: 16,
    padding: 4,
    backgroundColor: '#EEF1F6',
    borderRadius: 14,
  },
  segItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  segItemActive: {
    backgroundColor: '#FFFFFF',
    ...shadow,
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  segItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segItemTextActive: {
    color: colors.navy,
  },
  field: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
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
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: colors.navy,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  fieldErrorText: {
    fontSize: 12.5,
    color: colors.error,
    fontWeight: '600',
    marginTop: 6,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  formActions: {
    paddingHorizontal: 18,
    paddingTop: 6,
    gap: 10,
  },
  btnSuccess: {
    width: '100%',
    minHeight: 48,
    borderRadius: radii.button,
    backgroundColor: buttonColors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  btnSuccessText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  btnSecondary: {
    width: '100%',
    minHeight: 48,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  btnSecondaryText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
});