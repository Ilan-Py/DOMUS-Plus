import React, { useRef, useState } from 'react';
import { mostrarToast } from '../components/ToastHost';
import useColumnInset from '../hooks/useColumnInset';
import useFirstErrorFocus from '../hooks/useFirstErrorFocus';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { useFamily } from '../context/FamilyContext';
import PressScale from '../components/PressScale';
import { confirmarDestructivo } from '../utils/confirm';
import api from '../api/client';
import OptionPicker from '../components/OptionPicker';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import SegmentedControl from '../components/SegmentedControl';
import ErrorBanner from '../components/ErrorBanner';
import DatePickerField from '../components/DatePickerField';
import { HealthFormTopbar } from './healthFormShared';
import { programarNotificacion, cancelarNotificacion } from '../utils/notifications';
import { parseFechaHora } from '../utils/displayFormat';
import { hora as horaDe } from '../utils/formato';
import { rangoRecordatorio, validarFechaRecordatorio } from '../utils/dateRules';

import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

function sameDate(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

// Mismo orden que el menú «Agregar» (lo más frecuente primero). Sin preelección: si no viene del menú, se elige (DOS-09).
const TIPO_OPTIONS = [
  { label: 'Medicación', value: 'medicacion' },
  { label: 'Turno o control', value: 'control' },
  { label: 'Vacuna', value: 'vacuna' },
];
const TITULO_NUEVO = { medicacion: 'Nueva dosis', control: 'Nuevo turno', vacuna: 'Nueva vacuna' };
const TITULO_EDITAR = { medicacion: 'Editar dosis', control: 'Editar turno', vacuna: 'Editar vacuna' };
const GUARDAR = { medicacion: 'Guardar dosis', control: 'Guardar turno', vacuna: 'Guardar vacuna' };
const TIPOS_VALIDOS = TIPO_OPTIONS.map((opt) => opt.value);

// Combina la fecha y la hora (dos Date separados — el picker de 'time'
// ignora el resto de la porción de fecha del Date que devuelve) en un solo
// Date local, usando siempre getters locales para no mezclar con UTC.
// Repetición: opciones frecuentes y "Otra cantidad" (días escritos a mano).
// Mismos límites que valida el backend: cada 1–365 días, 2–100 veces.
const REPETICIONES = {
  'Todos los días': 1,
  'Cada semana': 7,
  'Cada 15 días': 15,
  'Cada 30 días': 30,
};
const VECES_POR_DEFECTO = '10';

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
  const inset = useColumnInset();
  const { ref, focusFirst } = useFirstErrorFocus();
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

  const tipoInicial = TIPOS_VALIDOS.includes(editando?.tipo) ? editando.tipo
    : TIPOS_VALIDOS.includes(params.tipo) ? params.tipo
    : '';
  const [tipo, setTipo] = useState(tipoInicial);
  const [tipoError, setTipoError] = useState(false);
  // Desde "+ Agregar para este día" del Calendario llega `fechaInicial` (clave AAAA-M-D, mes desde 0).
  const fechaPrecargada = (() => {
    if (editando || !params.fechaInicial) return null;
    const [y, m, d] = String(params.fechaInicial).split('-').map(Number);
    return Number.isFinite(y) ? new Date(y, m, d) : null;
  })();
  const [fecha, setFecha] = useState(() => fechaHoraEditando || fechaPrecargada);
  const [hora, setHora] = useState(() => fechaHoraEditando);
  // DOS-08: para una medicación, el título del evento es el medicamento (obligatorio) y la dosis («Losartán 50 mg»).
  // Se guardan juntos en `descripcion`; al editar, todo queda en «Medicamento».
  const [descripcion, setDescripcion] = useState(() => editando?.descripcion || '');
  const [dosis, setDosis] = useState('');
  const [medicamentoError, setMedicamentoError] = useState(false);
  const descripcionFinal = tipo === 'medicacion' ? [descripcion.trim(), dosis.trim()].filter(Boolean).join(' ') : descripcion.trim();

  // "Para quién": un integrante o una mascota del grupo (opcional). Cada opción
  // es el nombre; si una persona y una mascota se llaman igual se aclara.
  const { integrantes, mascotas } = useFamily();
  const miembros = [
    ...integrantes.map((m) => ({ nombre: m.nombre, clave: `integrante:${m.id}`, tipo: 'integrante', id: m.id })),
    ...mascotas.map((m) => ({ nombre: m.nombre, clave: `mascota:${m.id}`, tipo: 'mascota', id: m.id })),
  ].map((m, _, todos) => ({
    ...m,
    etiqueta: todos.filter((o) => o.nombre === m.nombre).length > 1 ? `${m.nombre} (${m.tipo})` : m.nombre,
  }));
  const claveInicial = editando?.integrante_id
    ? `integrante:${editando.integrante_id}`
    : editando?.mascota_id
      ? `mascota:${editando.mascota_id}`
      : params.ownerTipo && params.ownerId
        ? `${params.ownerTipo}:${params.ownerId}`
        : miembros.length === 1
          ? miembros[0].clave // DOS-09: si hay una sola persona o mascota, ya está elegida
          : '';
  const [paraClave, setParaClave] = useState(claveInicial);
  const paraEtiqueta = miembros.find((m) => m.clave === paraClave)?.etiqueta || '';
  const paraMiembro = miembros.find((m) => m.clave === paraClave);
  const paraCampos = paraMiembro
    ? paraMiembro.tipo === 'integrante'
      ? { integrante_id: paraMiembro.id }
      : { mascota_id: paraMiembro.id }
    : {};
  const [repeticion, setRepeticion] = useState('');
  const [veces, setVeces] = useState(VECES_POR_DEFECTO);
  const [repeticionError, setRepeticionError] = useState('');
  // Ya no hay interruptor «Recordatorio activo»: el estado lo dan las marcas (dada / no se dio) en Hoy y el Calendario.
  const activo = editando ? !!editando.activo : true;
  const [eliminando, setEliminando] = useState(false);
  const { width } = useWindowDimensions();
  const dosColumnas = width >= 600;

  const [fechaError, setFechaError] = useState(false);
  const [horaError, setHoraError] = useState(false);
  const [fechaHoraError, setFechaHoraError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initialRef = useRef({
    tipo: tipoInicial,
    fecha: fechaHoraEditando,
    hora: fechaHoraEditando,
    descripcion: editando?.descripcion || '',
  });

  const isDirty =
    tipo !== initialRef.current.tipo ||
    !sameDate(fecha, initialRef.current.fecha) ||
    !sameDate(hora, initialRef.current.hora) ||
    descripcionFinal !== initialRef.current.descripcion ||
    paraClave !== claveInicial;

  const { allowNextRemove } = useUnsavedChangesGuard(navigation, isDirty);

  async function handleGuardar() {
    const faltaTipo = !tipo;
    const faltaMedicamento = tipo === 'medicacion' && !descripcion.trim();
    const faltaFecha = !fecha;
    const faltaHora = !hora;
    setTipoError(faltaTipo);
    setMedicamentoError(faltaMedicamento);
    setFechaError(faltaFecha);
    setHoraError(faltaHora);
    setFechaHoraError('');
    setFormError('');

    if (faltaTipo || faltaMedicamento || faltaFecha || faltaHora) {
      focusFirst([[faltaMedicamento, 'medicamento'], [faltaFecha, 'fecha'], [faltaHora, 'hora']]);
      return;
    }

    // Repetición (sólo al crear): días entre repeticiones y cantidad de veces.
    let repetirCadaDias;
    let repetirVeces;
    if (!isEditing && repeticion) {
      repetirCadaDias = REPETICIONES[repeticion] ?? Number(repeticion.trim());
      repetirVeces = Number(veces);
      if (!Number.isInteger(repetirCadaDias) || repetirCadaDias < 1 || repetirCadaDias > 365) {
        setRepeticionError('Escribí un número de días entre 1 y 365.');
        return;
      }
      if (!Number.isInteger(repetirVeces) || repetirVeces < 2 || repetirVeces > 100) {
        setRepeticionError('La cantidad de veces tiene que estar entre 2 y 100.');
        return;
      }
    }
    setRepeticionError('');

    const fechaHoraLocal = combinarFechaHora(fecha, hora);

    // Misma regla que recordatoriosController: la fecha debe ser futura.
    if (fechaHoraLocal <= new Date()) {
      setFechaHoraError('Elegí una hora que todavía no pasó. Para anotar una dosis que ya se dio, marcala en Hoy.');
      focusFirst([[true, 'fecha']]);
      return;
    }
    const errRango = validarFechaRecordatorio(fechaHoraLocal);
    if (errRango) {
      setFechaHoraError(errRango);
      focusFirst([[true, 'fecha']]);
      return;
    }

    setSaving(true);
    try {
      // Se manda un instante absoluto (ISO con zona): el servidor lo interpreta igual sin importar en qué zona
      // horaria corra. Antes iba "AAAA-MM-DD HH:mm:00" sin zona y quedaba corrido si el servidor estaba en UTC.
      const fechaHoraStr = fechaHoraLocal.toISOString();
      let recordatorioId;
      if (isEditing) {
        // vacuna_id/tratamiento_id no se mandan — el vínculo no es
        // reasignable, el backend tampoco lo acepta en este endpoint (mismo
        // criterio que editar vacuna/tratamiento).
        await api.patch(`/api/recordatorios/${editando.id}`, {
          tipo,
          fecha_hora: fechaHoraStr,
          descripcion: descripcionFinal || undefined,
          // Siempre se manda "para quién" al editar (vacío = sin asignar).
          integrante_id: paraCampos.integrante_id ?? null,
          mascota_id: paraCampos.mascota_id ?? null,
        });
        recordatorioId = editando.id;
      } else {
        const creado = await api.post('/api/recordatorios', {
          tipo,
          fecha_hora: fechaHoraStr,
          descripcion: descripcionFinal || undefined,
          vacuna_id: vacunaId || undefined,
          tratamiento_id: tratamientoId || undefined,
          ...paraCampos,
          repetir_cada_dias: repetirCadaDias,
          repetir_veces: repetirVeces,
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
          activo
            ? programarNotificacion({ id: recordatorioId, tipo, fecha_hora: fechaHoraStr, descripcion: descripcionFinal })
            : null
        )
        .catch(() => {});
      // CalendarScreen refetch al recuperar el foco (useFocusEffect)
      allowNextRemove();
      // Repite lo importante para que se pueda chequear de un vistazo: «Listo: Losartán 50 mg, todos los días a las 08:00».
      const queEs = descripcionFinal || TIPO_OPTIONS.find((o) => o.value === tipo).label;
      const cada = repeticion ? (REPETICIONES[repeticion] ? `, ${repeticion.toLowerCase()}` : `, cada ${repeticion} días`) : '';
      mostrarToast(isEditing ? 'Cambios guardados' : `Listo: ${queEs}${cada} a las ${horaDe(fechaHoraLocal)}`);
      setSaved(true);
      setTimeout(() => navigation.goBack(), 380);
      return;
    } catch (err) {
      setFormError(err.mensaje);
    } finally {
      setSaving(false);
    }
  }

  function confirmarEliminar() {
    confirmarDestructivo(
      `¿Eliminar ${editando?.descripcion ? `«${editando.descripcion}»` : 'este aviso'}?`,
      'Lo dejan de ver todos en la familia. No se puede recuperar.',
      async () => {
        setEliminando(true);
        setFormError('');
        try {
          await api.delete(`/api/recordatorios/${editando.id}`);
          await cancelarNotificacion(editando.id).catch(() => {});
          allowNextRemove();
          navigation.goBack();
        } catch (err) {
          setFormError(err.mensaje);
          setEliminando(false);
        }
      }
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <HealthFormTopbar navigation={navigation} title={(isEditing ? TITULO_EDITAR : TITULO_NUEVO)[tipo] || (isEditing ? 'Editar aviso' : 'Nuevo aviso')} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: 20 + inset }]}>
        <View style={styles.card}>
          {miembros.length > 0 && (
            <OptionPicker
              label="¿Para quién?"
              options={miembros.map((m) => m.etiqueta)}
              value={paraEtiqueta}
              onChange={(etiqueta) => setParaClave(miembros.find((m) => m.etiqueta === etiqueta)?.clave || '')}
              style={{ paddingBottom: 20 }}
            />
          )}

          <Text style={styles.label}>¿Qué es?</Text>
          <SegmentedControl
            options={TIPO_OPTIONS}
            selectedValue={tipo}
            onChange={(v) => { setTipo(v); setTipoError(false); }}
            style={styles.segmented}
          />
          {tipoError && <Text style={styles.errorCampo} accessibilityRole="alert">Elegí qué es: una dosis, un turno o una vacuna.</Text>}

          {tipo === 'medicacion' ? (
            <View style={dosColumnas ? styles.twoCols : null}>
              <FormField
                inputRef={ref('medicamento')}
                label="Medicamento"
                value={descripcion}
                onChangeText={(t) => { setDescripcion(t); setMedicamentoError(false); }}
                placeholder="Losartán"
                error={medicamentoError ? 'Escribí el nombre del medicamento.' : ''}
                style={[styles.field, dosColumnas && styles.col]}
              />
              <FormField
                label="Dosis (opcional)"
                value={dosis}
                onChangeText={setDosis}
                placeholder="50 mg, 1 comprimido"
                style={[styles.field, dosColumnas && styles.col]}
              />
            </View>
          ) : tipo ? (
            <FormField
              label={tipo === 'control' ? '¿Con quién o dónde? (opcional)' : '¿Qué vacuna? (opcional)'}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder={tipo === 'control' ? 'Dra. Paz, cardióloga' : 'Antigripal'}
              style={styles.field}
            />
          ) : null}

          <View style={dosColumnas ? styles.twoCols : null}>
            <DatePickerField
              inputRef={ref('fecha')}
              label="Fecha"
              value={fecha}
              onChange={(date) => {
                setFecha(date);
                setFechaError(false);
                if (fechaHoraError) setFechaHoraError('');
              }}
              mode="date"
              minimumDate={rangoRecordatorio().min}
              maximumDate={rangoRecordatorio().max}
              error={fechaError ? 'Elegí la fecha.' : ''}
              style={[styles.field, dosColumnas && styles.col]}
            />
            <DatePickerField
              inputRef={ref('hora')}
              label="Hora"
              value={hora}
              onChange={(date) => {
                setHora(date);
                setHoraError(false);
                if (fechaHoraError) setFechaHoraError('');
              }}
              mode="time"
              error={horaError ? 'Elegí la hora.' : fechaHoraError}
              style={[styles.field, dosColumnas && styles.col]}
            />
          </View>

          {!isEditing && (
            <View style={styles.field}>
              <OptionPicker
                label="¿Se repite? (opcional)"
                options={Object.keys(REPETICIONES)}
                value={repeticion}
                onChange={(v) => {
                  setRepeticion(v);
                  setRepeticionError('');
                }}
                otherLabel="Otra cantidad"
                otherFieldLabel="Cada cuántos días"
                otherPlaceholder="Ej. 10"
                error={repeticionError}
                style={{ paddingBottom: 0 }}
              />
              {!!repeticion && (
                <FormField
                  label="Cuántas veces en total"
                  value={veces}
                  onChangeText={(t) => {
                    setVeces(t.replace(/\D/g, ''));
                    setRepeticionError('');
                  }}
                  placeholder="Ej. 10…"
                  keyboardType="number-pad"
                  style={{ paddingTop: 20, paddingBottom: 0 }}
                />
              )}
            </View>
          )}

          {!!formError && (
            <View style={styles.field}>
              <ErrorBanner message={formError} />
            </View>
          )}

          <View style={styles.formActions}>
            <PrimaryButton
              title={isEditing ? 'Guardar cambios' : GUARDAR[tipo] || 'Guardar'}
              onPress={handleGuardar}
              loading={saving}
              success={saved}
              disabled={eliminando}
              variant="accent"
            />
            {isEditing && (
              <PressScale
                contentStyle={styles.deleteBtn}
                onPress={confirmarEliminar}
                disabled={saving || eliminando}
                accessibilityLabel="Eliminar este aviso"
              >
                <Text style={styles.deleteText}>{eliminando ? 'Eliminando…' : 'Eliminar este aviso'}</Text>
              </PressScale>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  errorCampo: { fontSize: 14, lineHeight: 20, fontFamily: poppinsWeight('600'), color: '#A6291B', marginTop: -8, marginBottom: 16 },
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: 20,
    paddingBottom: 112,
  },
  // Formulario enmarcado: tarjeta blanca con borde fino cálido.
  card: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: poppinsWeight('600'),
    color: colors.ink,
    marginBottom: 8,
  },
  segmented: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 20,
  },
  twoCols: { flexDirection: 'row', gap: 16 },
  col: { flex: 1 },
  field: {
    paddingBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  switchText: { flex: 1 },
  switchLabel: {
    fontSize: 16,
    fontFamily: poppinsWeight('600'),
    color: colors.ink,
  },
  switchHelp: { fontSize: 14, lineHeight: 20, color: colors.textBody, marginTop: 4 },
  formActions: {
    gap: 8,
    marginTop: 4,
  },
  deleteBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 16,
    fontFamily: poppinsWeight('600'),
    color: colors.limeDeep,
  },
});
