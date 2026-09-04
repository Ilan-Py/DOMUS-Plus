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

export default function AddTreatmentScreen({ navigation, route }) {
  const { ownerId, ownerTipo, ownerNombre, editando } = route.params;
  const isEditing = !!editando;

  const [descripcion, setDescripcion] = useState(() => editando?.descripcion || '');
  const [medicacion, setMedicacion] = useState(() => editando?.medicacion || '');
  const [fechaInicio, setFechaInicio] = useState(() =>
    editando?.fecha_inicio ? parseApiDate(editando.fecha_inicio) : null
  );
  const [fechaFin, setFechaFin] = useState(() =>
    editando?.fecha_fin ? parseApiDate(editando.fecha_fin) : null
  );

  const [descripcionError, setDescripcionError] = useState(false);
  const [medicacionError, setMedicacionError] = useState(false);
  const [fechaInicioError, setFechaInicioError] = useState(false);
  const [fechaFinError, setFechaFinError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleGuardar() {
    const faltaDescripcion = !descripcion.trim();
    const faltaMedicacion = !medicacion.trim();
    const faltaFechaInicio = !fechaInicio;
    setDescripcionError(faltaDescripcion);
    setMedicacionError(faltaMedicacion);
    setFechaInicioError(faltaFechaInicio);
    setFechaFinError('');
    setFormError('');

    if (faltaDescripcion || faltaMedicacion || faltaFechaInicio) return;

    // El backend no valida esto (a diferencia del CHECK de vacuna) — es la
    // única validación de que fecha_fin no sea anterior a fecha_inicio.
    if (fechaFin && fechaFin < fechaInicio) {
      setFechaFinError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        descripcion,
        medicacion,
        fecha_inicio: formatDateOnly(fechaInicio),
        fecha_fin: fechaFin ? formatDateOnly(fechaFin) : undefined,
      };
      if (isEditing) {
        // El dueño (integrante_id/mascota_id) no se manda al editar — no
        // puede cambiar, y el backend tampoco lo acepta en este endpoint.
        await api.patch(`/api/salud/tratamientos/${editando.id}`, payload);
      } else {
        await api.post('/api/salud/tratamientos', { ...ownerField(ownerTipo, ownerId), ...payload });
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
        title={isEditing ? `Editar tratamiento · ${ownerNombre}` : `Nuevo tratamiento · ${ownerNombre}`}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <FormField
          label="Descripción"
          value={descripcion}
          onChangeText={(text) => {
            setDescripcion(text);
            if (text.trim()) setDescripcionError(false);
          }}
          placeholder="Ej. Infección de oído"
          error={descripcionError ? 'Este campo es obligatorio' : ''}
          style={styles.field}
        />
        <FormField
          label="Medicación"
          value={medicacion}
          onChangeText={(text) => {
            setMedicacion(text);
            if (text.trim()) setMedicacionError(false);
          }}
          placeholder="Ej. Amoxicilina 250mg"
          error={medicacionError ? 'Este campo es obligatorio' : ''}
          style={styles.field}
        />
        <DatePickerField
          label="Fecha de inicio"
          value={fechaInicio}
          onChange={(date) => {
            setFechaInicio(date);
            setFechaInicioError(false);
            if (fechaFinError) setFechaFinError('');
          }}
          mode="date"
          error={fechaInicioError ? 'Este campo es obligatorio' : ''}
          style={styles.field}
        />
        <DatePickerField
          label="Fecha de fin (opcional)"
          value={fechaFin}
          onChange={(date) => {
            setFechaFin(date);
            if (fechaFinError) setFechaFinError('');
          }}
          mode="date"
          minimumDate={fechaInicio || undefined}
          error={fechaFinError}
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
