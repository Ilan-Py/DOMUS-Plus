import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme/colors';
import api from '../api/client';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import ErrorBanner from '../components/ErrorBanner';
import DatePickerField, { formatDateOnly } from '../components/DatePickerField';
import { HealthFormTopbar, ownerField } from './healthFormShared';
import { parseApiDate } from '../utils/displayFormat';

export default function AddVaccineScreen({ navigation, route }) {
  const { ownerId, ownerTipo, ownerNombre, editando } = route.params;
  const isEditing = !!editando;

  const [nombre, setNombre] = useState(() => editando?.nombre || '');
  const [fechaAplicacion, setFechaAplicacion] = useState(() =>
    editando?.fecha_aplicacion ? parseApiDate(editando.fecha_aplicacion) : null
  );
  const [proximaDosis, setProximaDosis] = useState(() =>
    editando?.proxima_dosis ? parseApiDate(editando.proxima_dosis) : null
  );
  const [notas, setNotas] = useState(() => editando?.notas || '');

  const [nombreError, setNombreError] = useState(false);
  const [fechaAplicacionError, setFechaAplicacionError] = useState(false);
  const [proximaDosisError, setProximaDosisError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleGuardar() {
    const faltaNombre = !nombre.trim();
    const faltaFecha = !fechaAplicacion;
    setNombreError(faltaNombre);
    setFechaAplicacionError(faltaFecha);
    setProximaDosisError('');
    setFormError('');

    if (faltaNombre || faltaFecha) return;

    // Misma regla que el CHECK de la tabla vacuna: proxima_dosis > fecha_aplicacion
    if (proximaDosis && proximaDosis <= fechaAplicacion) {
      setProximaDosisError('La próxima dosis debe ser posterior a la fecha de aplicación.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre,
        fecha_aplicacion: formatDateOnly(fechaAplicacion),
        proxima_dosis: proximaDosis ? formatDateOnly(proximaDosis) : undefined,
        notas: notas || undefined,
      };
      if (isEditing) {
        // El dueño (integrante_id/mascota_id) no se manda al editar — no
        // puede cambiar, y el backend tampoco lo acepta en este endpoint.
        await api.patch(`/api/salud/vacunas/${editando.id}`, payload);
      } else {
        await api.post('/api/salud/vacunas', { ...ownerField(ownerTipo, ownerId), ...payload });
      }
      // ProfileDetailScreen refetch al recuperar el foco (useFocusEffect)
      navigation.goBack();
    } catch (err) {
      setFormError(err.mensaje);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <HealthFormTopbar
        navigation={navigation}
        title={isEditing ? `Editar vacuna · ${ownerNombre}` : `Nueva vacuna · ${ownerNombre}`}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <FormField
          label="Nombre de la vacuna"
          value={nombre}
          onChangeText={(text) => {
            setNombre(text);
            if (text.trim()) setNombreError(false);
          }}
          placeholder="Ej. Antirrábica"
          error={nombreError ? 'Este campo es obligatorio' : ''}
          style={styles.field}
        />
        <DatePickerField
          label="Fecha de aplicación"
          value={fechaAplicacion}
          onChange={(date) => {
            setFechaAplicacion(date);
            setFechaAplicacionError(false);
            if (proximaDosisError) setProximaDosisError('');
          }}
          mode="date"
          error={fechaAplicacionError ? 'Este campo es obligatorio' : ''}
          style={styles.field}
        />
        <DatePickerField
          label="Próxima dosis (opcional)"
          value={proximaDosis}
          onChange={(date) => {
            setProximaDosis(date);
            if (proximaDosisError) setProximaDosisError('');
          }}
          mode="date"
          minimumDate={fechaAplicacion || undefined}
          error={proximaDosisError}
          style={styles.field}
        />
        <FormField
          label="Notas"
          value={notas}
          onChangeText={setNotas}
          placeholder="Observaciones, laboratorio, lote..."
          multiline
          style={styles.field}
        />

        {!!formError && (
          <View style={styles.field}>
            <ErrorBanner message={formError} />
          </View>
        )}

        <View style={styles.formActions}>
          <PrimaryButton
            title={isEditing ? 'Guardar cambios' : 'Guardar'}
            onPress={handleGuardar}
            loading={saving}
            variant="success"
          />
          <PrimaryButton
            title="Cancelar"
            onPress={() => navigation.goBack()}
            variant="secondary"
          />
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
  // 100 (no 40) para despejar la tab bar flotante (position:'absolute' en
  // MainTabs) — mismo valor que CalendarScreen/FamilyListScreen.
  scroll: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  field: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  formActions: {
    paddingHorizontal: 18,
    paddingTop: 6,
    gap: 10,
  },
});
