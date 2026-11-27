import React, { useRef, useState } from 'react';
import { mostrarToast } from '../components/ToastHost';
import useColumnInset from '../hooks/useColumnInset';
import useFirstErrorFocus from '../hooks/useFirstErrorFocus';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme/colors';
import api from '../api/client';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import DeleteLink from '../components/DeleteLink';
import { confirmarDestructivo } from '../utils/confirm';
import ErrorBanner from '../components/ErrorBanner';
import DatePickerField, { formatDateOnly } from '../components/DatePickerField';
import { HealthFormTopbar, ownerField } from './healthFormShared';
import { parseApiDate } from '../utils/displayFormat';
import { rangoAplicacion, rangoProximaDosis, validarAplicacion, validarProximaDosis } from '../utils/dateRules';

import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

function sameDate(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

export default function AddVaccineScreen({ navigation, route }) {
  const inset = useColumnInset();
  const { ref, focusFirst } = useFirstErrorFocus();
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
  const [fechaAplicacionError, setFechaAplicacionError] = useState('');
  const [proximaDosisError, setProximaDosisError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initialRef = useRef({
    nombre: editando?.nombre || '',
    fechaAplicacion: editando?.fecha_aplicacion ? parseApiDate(editando.fecha_aplicacion) : null,
    proximaDosis: editando?.proxima_dosis ? parseApiDate(editando.proxima_dosis) : null,
    notas: editando?.notas || '',
  });

  const isDirty =
    nombre !== initialRef.current.nombre ||
    !sameDate(fechaAplicacion, initialRef.current.fechaAplicacion) ||
    !sameDate(proximaDosis, initialRef.current.proximaDosis) ||
    notas !== initialRef.current.notas;

  const { allowNextRemove } = useUnsavedChangesGuard(navigation, isDirty);
  const [eliminando, setEliminando] = useState(false);

  // Eliminar desde la propia pantalla de edición (las tarjetas de la lista sólo
  // tienen el lápiz).
  function confirmarEliminar() {
    confirmarDestructivo(
      'Eliminar vacuna',
      '¿Seguro que querés eliminar esta vacuna? No se puede deshacer.',
      async () => {
        setEliminando(true);
        setFormError('');
        try {
          await api.delete(`/api/salud/vacunas/${editando.id}`);
          allowNextRemove();
          navigation.goBack();
        } catch (err) {
          setFormError(err.mensaje);
          setEliminando(false);
        }
      }
    );
  }

  async function handleGuardar() {
    const faltaNombre = !nombre.trim();
    const faltaFecha = !fechaAplicacion;
    setNombreError(faltaNombre);
    setFechaAplicacionError(faltaFecha ? 'Este campo es obligatorio' : validarAplicacion(fechaAplicacion));
    setProximaDosisError('');
    setFormError('');

    if (faltaNombre || faltaFecha) {
      focusFirst([[faltaNombre, 'nombre'], [faltaFecha, 'aplicacion']]);
      return;
    }

    // Fechas razonables (ver utils/dateRules.js). La próxima dosis debe ser
    // posterior a la aplicación (mismo CHECK que la tabla vacuna).
    const errAplicacion = validarAplicacion(fechaAplicacion);
    const errProxima = proximaDosis ? validarProximaDosis(proximaDosis, fechaAplicacion) : '';
    if (errAplicacion || errProxima) {
      setFechaAplicacionError(errAplicacion);
      setProximaDosisError(errProxima);
      focusFirst([[errAplicacion, 'aplicacion'], [errProxima, 'proxima']]);
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
      allowNextRemove();
      mostrarToast(isEditing ? 'Cambios guardados' : 'Vacuna guardada');
      setSaved(true);
      setTimeout(() => navigation.goBack(), 380);
      return;
    } catch (err) {
      setFormError(err.mensaje);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <HealthFormTopbar
        navigation={navigation}
        title={isEditing ? `Editar vacuna · ${ownerNombre}` : `Nueva vacuna · ${ownerNombre}`}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: inset }]}>
        <FormField
          inputRef={ref('nombre')}
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
          inputRef={ref('aplicacion')}
          label="Fecha de aplicación"
          value={fechaAplicacion}
          onChange={(date) => {
            setFechaAplicacion(date);
            setFechaAplicacionError('');
            if (proximaDosisError) setProximaDosisError('');
          }}
          mode="date"
          minimumDate={rangoAplicacion().min}
          maximumDate={rangoAplicacion().max}
          error={fechaAplicacionError}
          style={styles.field}
        />
        <DatePickerField
          inputRef={ref('proxima')}
          label="Próxima dosis (opcional)"
          value={proximaDosis}
          onChange={(date) => {
            setProximaDosis(date);
            if (proximaDosisError) setProximaDosisError('');
          }}
          mode="date"
          minimumDate={rangoProximaDosis(fechaAplicacion).min}
          maximumDate={rangoProximaDosis(fechaAplicacion).max}
          minimumDate={fechaAplicacion || undefined}
          error={proximaDosisError}
          style={styles.field}
        />
        <FormField
          label="Notas"
          value={notas}
          onChangeText={setNotas}
          placeholder="Observaciones, laboratorio, lote…"
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
            success={saved}
            disabled={eliminando}
            variant="accent"
          />
          {isEditing && (
            <DeleteLink
              label="Eliminar vacuna"
              onPress={confirmarEliminar}
              disabled={saving || eliminando}
              busy={eliminando}
            />
          )}
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
