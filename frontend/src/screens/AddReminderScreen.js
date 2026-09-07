import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme/colors';
import api from '../api/client';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import SegmentedControl from '../components/SegmentedControl';
import ErrorBanner from '../components/ErrorBanner';
import DatePickerField, { formatDateOnly, formatTimeOnly } from '../components/DatePickerField';
import { HealthFormTopbar } from './healthFormShared';
import { programarNotificacion, cancelarNotificacion } from '../utils/notifications';
import { parseFechaHora } from '../utils/displayFormat';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

function sameDate(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

const TIPO_OPTIONS = [
  { label: 'Vacuna', value: 'vacuna' },
  { label: 'Control', value: 'control' },
  { label: 'Medicación', value: 'medicacion' },
];
const TIPOS_VALIDOS = TIPO_OPTIONS.map((opt) => opt.value);

// Combina la fecha y la hora (dos Date separados — el picker de 'time'
// ignora el resto de la porción de fecha del Date que devuelve) en un solo
// Date local, usando siempre getters locales para no mezclar con UTC.
function combinarFechaHora(fecha, hora) {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    hora.getHours(),
    hora.getMinutes(),
    0,
    0
  );
}

export default function AddReminderScreen({ navigation, route }) {
  // Prefill opcional al abrir desde un registro de salud (aún no usado en
  // ningún lado de la app — contrato definido en el plan para uso futuro).
  const params = route.params || {};
  const vacunaId = params.vacunaId;
  const tratamientoId = params.tratamientoId;
  const editando = params.editando;
  const isEditing = !!editando;

  // parseFechaHora arma un solo Date local correcto (ver utils/displayFormat.js);
  // se parte en dos porque DatePickerField expone fecha y hora como campos
  // separados, igual que al crear.
  const fechaHoraEditando = editando ? parseFechaHora(editando.fecha_hora) : null;

  const [tipo, setTipo] = useState(
    TIPOS_VALIDOS.includes(editando?.tipo) ? editando.tipo
      : TIPOS_VALIDOS.includes(params.tipo) ? params.tipo
      : 'control'
  );
  const [fecha, setFecha] = useState(() => fechaHoraEditando);
  const [hora, setHora] = useState(() => fechaHoraEditando);
  const [descripcion, setDescripcion] = useState(() => editando?.descripcion || '');

  const [fechaError, setFechaError] = useState(false);
  const [horaError, setHoraError] = useState(false);
  const [fechaHoraError, setFechaHoraError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initialRef = useRef({
    tipo: TIPOS_VALIDOS.includes(editando?.tipo) ? editando.tipo
      : TIPOS_VALIDOS.includes(params.tipo) ? params.tipo
      : 'control',
    fecha: fechaHoraEditando,
    hora: fechaHoraEditando,
    descripcion: editando?.descripcion || '',
  });

  const isDirty =
    tipo !== initialRef.current.tipo ||
    !sameDate(fecha, initialRef.current.fecha) ||
    !sameDate(hora, initialRef.current.hora) ||
    descripcion !== initialRef.current.descripcion;

  const { allowNextRemove } = useUnsavedChangesGuard(navigation, isDirty);

  async function handleGuardar() {
    const faltaFecha = !fecha;
    const faltaHora = !hora;
    setFechaError(faltaFecha);
    setHoraError(faltaHora);
    setFechaHoraError('');
    setFormError('');

    if (faltaFecha || faltaHora) return;

    const fechaHoraLocal = combinarFechaHora(fecha, hora);

    // Misma regla que recordatoriosController: la fecha debe ser futura.
    if (fechaHoraLocal <= new Date()) {
      setFechaHoraError('La fecha del recordatorio debe ser futura.');
      return;
    }

    setSaving(true);
    try {
      const fechaHoraStr = `${formatDateOnly(fechaHoraLocal)} ${formatTimeOnly(fechaHoraLocal)}:00`;
      let recordatorioId;
      if (isEditing) {
        // vacuna_id/tratamiento_id no se mandan — el vínculo no es
        // reasignable, el backend tampoco lo acepta en este endpoint (mismo
        // criterio que editar vacuna/tratamiento).
        await api.patch(`/api/recordatorios/${editando.id}`, {
          tipo,
          fecha_hora: fechaHoraStr,
          descripcion: descripcion || undefined,
        });
        recordatorioId = editando.id;
      } else {
        const creado = await api.post('/api/recordatorios', {
          tipo,
          fecha_hora: fechaHoraStr,
          descripcion: descripcion || undefined,
          vacuna_id: vacunaId || undefined,
          tratamiento_id: tratamientoId || undefined,
        });
        recordatorioId = creado.id;
      }
      // Si no hay permiso de notificaciones (o falla por cualquier otra
      // razón), el recordatorio ya se guardó igual como entrada de
      // calendario — no bloquea el flujo de guardado. No se espera ni se
      // reporta error acá a propósito.
      //
      // Al editar: cancelar la notificación programada con el horario viejo
      // antes de programar la nueva — si no, el dispositivo terminaría
      // avisando dos veces (una a la hora vieja, otra a la nueva).
      (isEditing ? cancelarNotificacion(recordatorioId) : Promise.resolve())
        .then(() =>
          programarNotificacion({ id: recordatorioId, tipo, fecha_hora: fechaHoraStr, descripcion })
        )
        .catch(() => {});
      // CalendarScreen refetch al recuperar el foco (useFocusEffect)
      allowNextRemove();
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
      <HealthFormTopbar navigation={navigation} title={isEditing ? 'Editar recordatorio' : 'Nuevo recordatorio'} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <SegmentedControl
          options={TIPO_OPTIONS}
          selectedValue={tipo}
          onChange={setTipo}
          style={styles.segmented}
        />

        <DatePickerField
          label="Fecha"
          value={fecha}
          onChange={(date) => {
            setFecha(date);
            setFechaError(false);
            if (fechaHoraError) setFechaHoraError('');
          }}
          mode="date"
          minimumDate={new Date()}
          error={fechaError ? 'Este campo es obligatorio' : ''}
          style={styles.field}
        />
        <DatePickerField
          label="Hora"
          value={hora}
          onChange={(date) => {
            setHora(date);
            setHoraError(false);
            if (fechaHoraError) setFechaHoraError('');
          }}
          mode="time"
          error={horaError ? 'Este campo es obligatorio' : fechaHoraError}
          style={styles.field}
        />
        <FormField
          label="Descripción (opcional)"
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Detalles del recordatorio..."
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
    paddingBottom: 100,
  },
  segmented: {
    marginHorizontal: 18,
    marginTop: 16,
    marginBottom: 4,
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
