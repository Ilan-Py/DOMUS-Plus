import React, { useRef, useState } from 'react';
import { mostrarToast } from '../components/ToastHost';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, radii, shadow } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import api from '../api/client';
import { useFamily } from '../context/FamilyContext';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import SegmentedControl from '../components/SegmentedControl';
import AvatarPicker from '../components/AvatarPicker';
import ErrorBanner from '../components/ErrorBanner';
import DatePickerField, { formatDateOnly } from '../components/DatePickerField';
import OptionPicker from '../components/OptionPicker';
import ScreenHeader from '../components/ScreenHeader';
import useColumnInset from '../hooks/useColumnInset';
import useFirstErrorFocus from '../hooks/useFirstErrorFocus';
import { parseApiDate } from '../utils/displayFormat';
import { rangoNacimiento, validarNacimiento } from '../utils/dateRules';

import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

function sameDate(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

const ESPECIES = ['Perro', 'Gato', 'Ave'];

// El tipo (menor / adulto / mayor) se calcula solo a partir de la fecha de
// nacimiento: menor hasta 17 años, adulto de 18 a 64, mayor desde 65. Se sigue
// enviando porque algunas versiones del backend lo piden; las nuevas lo
// recalculan igual.
function tipoPorEdad(fecha) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const cumpleEsteAnio =
    hoy.getMonth() > fecha.getMonth() ||
    (hoy.getMonth() === fecha.getMonth() && hoy.getDate() >= fecha.getDate());
  if (!cumpleEsteAnio) edad -= 1;
  if (edad < 18) return 'menor';
  if (edad < 65) return 'adulto';
  return 'mayor';
}
const TIPO_MIEMBRO_OPTIONS = [
  { label: 'Persona', value: 'integrante' },
  { label: 'Mascota', value: 'mascota' },
];

// 'adulto' -> 'Adulto' — inverso del .toLowerCase() que arma el payload al
// guardar; memberToEdit.tipo siempre llega en minúsculas (columna ENUM).
export default function AddMemberScreen({ navigation, route }) {
  const inset = useColumnInset();
  const { ref, focusFirst } = useFirstErrorFocus();
  const { refresh } = useFamily();

  // memberToEdit: el item completo de integrante/mascota (viene de
  // FamilyListScreen — long-press — o ProfileDetailScreen — botón editar).
  // Su presencia decide el modo de la pantalla; tipoMiembro siempre lo manda
  // el caller explícitamente en ese caso, nunca se infiere del objeto.
  const { memberToEdit } = route?.params || {};
  const isEditing = !!memberToEdit;

  // Soporte mínimo para preseleccionar el segmentado desde afuera (RadialFab
  // en FamilyListScreen, o el modo edición) — cualquier otro valor, o
  // ausencia del param, cae al default de siempre ('integrante').
  const tipoMiembroInicial = route?.params?.tipoMiembro === 'mascota' ? 'mascota' : 'integrante';
  const [tipoMiembro, setTipoMiembro] = useState(tipoMiembroInicial); // 'integrante' | 'mascota' — el segmentado sólo se muestra si !isEditing, ver JSX
  const [nombre, setNombre] = useState(() => memberToEdit?.nombre || '');
  const [nombreError, setNombreError] = useState('');

  // Campos de integrante
  const [apellido, setApellido] = useState(() => memberToEdit?.apellido || '');
  const [apellidoError, setApellidoError] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState(() =>
    memberToEdit?.fecha_nacimiento ? parseApiDate(memberToEdit.fecha_nacimiento) : null
  );
  const [fechaNacimientoError, setFechaNacimientoError] = useState('');
  const [observaciones, setObservaciones] = useState(() => memberToEdit?.observaciones || '');

  // Campos de mascota
  const [especie, setEspecie] = useState(() => memberToEdit?.especie || '');
  const [especieError, setEspecieError] = useState('');
  const [raza, setRaza] = useState(() => memberToEdit?.raza || '');
  const [avatarId, setAvatarId] = useState(() => memberToEdit?.avatar_id || null);
  // Ficha rápida de la libreta sanitaria (opcional).
  const [sexo, setSexo] = useState(() => (memberToEdit?.sexo === 'hembra' ? 'Hembra' : memberToEdit?.sexo === 'macho' ? 'Macho' : ''));
  const [castrado, setCastrado] = useState(() => (memberToEdit?.castrado === true ? 'Sí' : memberToEdit?.castrado === false ? 'No' : ''));
  const [microchip, setMicrochip] = useState(() => memberToEdit?.microchip || '');

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Snapshot de los valores iniciales (vacíos en alta, los de memberToEdit
  // en edición) — capturado una sola vez al montar, para comparar contra el
  // estado vigente y decidir si hay algo que se perdería al salir.
  const initialRef = useRef({
    tipoMiembro: tipoMiembroInicial,
    nombre: memberToEdit?.nombre || '',
    apellido: memberToEdit?.apellido || '',
    fechaNacimiento: memberToEdit?.fecha_nacimiento ? parseApiDate(memberToEdit.fecha_nacimiento) : null,
    observaciones: memberToEdit?.observaciones || '',
    especie: memberToEdit?.especie || '',
    raza: memberToEdit?.raza || '',
    avatarId: memberToEdit?.avatar_id || null,
    sexo: memberToEdit?.sexo || '',
    castrado: memberToEdit?.castrado ?? null,
    microchip: memberToEdit?.microchip || '',
  });

  const isDirty =
    tipoMiembro !== initialRef.current.tipoMiembro ||
    nombre !== initialRef.current.nombre ||
    apellido !== initialRef.current.apellido ||
    !sameDate(fechaNacimiento, initialRef.current.fechaNacimiento) ||
    observaciones !== initialRef.current.observaciones ||
    especie !== initialRef.current.especie ||
    raza !== initialRef.current.raza ||
    avatarId !== initialRef.current.avatarId ||
    (sexo ? sexo.toLowerCase() : '') !== initialRef.current.sexo ||
    (castrado === 'Sí' ? true : castrado === 'No' ? false : null) !== initialRef.current.castrado ||
    microchip !== initialRef.current.microchip;

  const { allowNextRemove } = useUnsavedChangesGuard(navigation, isDirty);

  async function handleGuardar() {
    const faltaNombre = !nombre.trim();
    const faltaApellido = tipoMiembro === 'integrante' && !apellido.trim();
    const faltaFechaNacimiento = tipoMiembro === 'integrante' && !fechaNacimiento;
    const faltaEspecie = tipoMiembro === 'mascota' && !especie.trim();
    setNombreError(faltaNombre ? 'Escribí el nombre.' : '');
    setApellidoError(faltaApellido ? 'Escribí el apellido.' : '');
    const errNacimiento = fechaNacimiento ? validarNacimiento(fechaNacimiento) : '';
    setFechaNacimientoError(faltaFechaNacimiento ? 'Elegí la fecha de nacimiento.' : errNacimiento);
    setEspecieError(faltaEspecie ? 'Elegí la especie.' : '');
    setFormError('');

    if (faltaNombre || faltaApellido || faltaFechaNacimiento || faltaEspecie || errNacimiento) {
      focusFirst([
        [faltaNombre, 'nombre'],
        [faltaApellido, 'apellido'],
        [faltaFechaNacimiento || errNacimiento, 'nacimiento'],
      ]);
      return;
    }

    setSaving(true);
    let creado = null;
    try {
      if (tipoMiembro === 'integrante') {
        // Enum de MySQL en minúsculas ('adulto'|'menor'|'mayor') — el picker
        // muestra las etiquetas capitalizadas, se convierte recién acá.
        const payload = {
          nombre,
          apellido,
          fecha_nacimiento: fechaNacimiento ? formatDateOnly(fechaNacimiento) : undefined,
          tipo: tipoPorEdad(fechaNacimiento),
          observaciones: observaciones || undefined,
          avatar_id: avatarId,
        };
        if (isEditing) {
          await api.patch(`/api/familia/integrantes/${memberToEdit.id}`, payload);
        } else {
          creado = await api.post('/api/familia/integrantes', payload);
        }
      } else {
        // fecha_nacimiento va siempre: antes no se mandaba y al editar una mascota se borraba su fecha.
        const payload = {
          nombre,
          especie,
          raza: raza || undefined,
          fecha_nacimiento: fechaNacimiento ? formatDateOnly(fechaNacimiento) : null,
          sexo: sexo ? sexo.toLowerCase() : null,
          castrado: castrado === 'Sí' ? true : castrado === 'No' ? false : null,
          microchip: microchip.trim() || null,
          observaciones: observaciones.trim() || null,
          avatar_id: avatarId,
        };
        if (isEditing) {
          await api.patch(`/api/familia/mascotas/${memberToEdit.id}`, payload);
        } else {
          await api.post('/api/familia/mascotas', payload);
        }
      }

      await refresh();
      allowNextRemove();
      if (creado?.id) {
        // EME-08: una ficha vacía es justo la que falta en una emergencia. Se ofrece completarla en el momento.
        mostrarToast(`${nombre} ya está en tu familia`, {
          accion: {
            etiqueta: 'Completar su ficha',
            onPress: () => navigation.navigate('Emergency', { id: creado.id, nombre: `${nombre} ${apellido}` }),
          },
        });
      } else {
        mostrarToast(isEditing ? 'Cambios guardados' : tipoMiembro === 'mascota' ? `${nombre} ya está en tu familia` : 'Integrante guardado');
      }
      // Beat breve de confirmación (checkmark en el botón) antes de salir en
      // vez de un goBack() instantáneo y silencioso — ver PrimaryButton.
      // ~380ms totales: alcanza para que el check haga su pop-in (spring
      // ~200ms) y quede visible un instante, sin sentirse como que traba la
      // salida.
      setSaved(true);
      setTimeout(() => navigation.goBack(), 380);
      return;
    } catch (err) {
      if (err.status === 400 && /fecha de nacimiento/i.test(err.mensaje || '')) {
        setFechaNacimientoError(err.mensaje);
      } else {
        setFormError(err.mensaje);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title={isEditing ? 'Editar' : 'Agregar a la familia'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: inset }]}>
        {isEditing ? (
          // El tipo (persona/mascota) no se puede cambiar al editar — id y
          // tabla ya están fijados por memberToEdit. Mismo texto que el label
          // "Tipo" de abajo, no el segmentado interactivo.
          <Text style={styles.lockedTipo}>
            {tipoMiembro === 'integrante' ? 'Persona' : 'Mascota'}
          </Text>
        ) : (
          <SegmentedControl
            options={TIPO_MIEMBRO_OPTIONS}
            selectedValue={tipoMiembro}
            onChange={(valor) => {
              setTipoMiembro(valor);
              setAvatarId(null); // los catálogos de personas y mascotas son distintos
            }}
          />
        )}

        <AvatarPicker
          mode={tipoMiembro === 'mascota' ? 'pet' : 'person'}
          value={avatarId}
          onChange={setAvatarId}
          name={nombre}
          apellido={apellido}
        />

        <FormField
          inputRef={ref('nombre')}
          label="Nombre"
          value={nombre}
          onChangeText={(text) => {
            setNombre(text);
            if (nombreError) setNombreError('');
          }}
          placeholder={tipoMiembro === 'integrante' ? 'Ej. Roberto' : 'Ej. Firulais'}
          error={nombreError}
          style={styles.field}
        />

        {tipoMiembro === 'integrante' ? (
          <>
            <FormField
              inputRef={ref('apellido')}
              label="Apellido"
              value={apellido}
              onChangeText={(text) => {
                setApellido(text);
                if (apellidoError) setApellidoError('');
              }}
              placeholder="Ej. Pérez"
              error={apellidoError}
              style={styles.field}
            />
            <DatePickerField
              inputRef={ref('nacimiento')}
              label="Fecha de nacimiento"
              value={fechaNacimiento}
              onChange={(date) => {
                setFechaNacimiento(date);
                if (fechaNacimientoError) setFechaNacimientoError('');
              }}
              mode="date"
              minimumDate={rangoNacimiento().min}
              maximumDate={rangoNacimiento().max}
              error={fechaNacimientoError}
              style={styles.field}
            />
            <FormField
              label="Nota para quien lo cuide (opcional)"
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Usa audífono, le gusta caminar a la mañana…"
              multiline
              style={styles.field}
            />
          </>
        ) : (
          <>
            <OptionPicker
              label="Especie"
              options={ESPECIES}
              value={especie}
              onChange={(value) => {
                setEspecie(value);
                if (value.trim()) setEspecieError('');
              }}
              otherLabel="Otro"
              otherFieldLabel="¿Qué animal es?"
              otherPlaceholder="Ej. Conejo"
              optional={false}
              error={especieError}
              style={styles.field}
            />
            <FormField
              label="Raza (opcional)"
              value={raza}
              onChangeText={setRaza}
              placeholder="Border Collie"
              style={styles.field}
            />
            <DatePickerField
              label="Fecha de nacimiento (opcional)"
              value={fechaNacimiento}
              onChange={(date) => {
                setFechaNacimiento(date);
                if (fechaNacimientoError) setFechaNacimientoError('');
              }}
              mode="date"
              minimumDate={rangoNacimiento().min}
              maximumDate={rangoNacimiento().max}
              error={fechaNacimientoError}
              style={styles.field}
            />
            <OptionPicker label="Sexo (opcional)" options={['Macho', 'Hembra']} value={sexo} onChange={setSexo} style={styles.field} />
            <OptionPicker label="¿Está castrado/a? (opcional)" options={['Sí', 'No']} value={castrado} onChange={setCastrado} style={styles.field} />
            <FormField
              label="Microchip (opcional)"
              value={microchip}
              onChangeText={setMicrochip}
              placeholder="Número del chip"
              style={styles.field}
            />
            <FormField
              label="Nota para quien la cuide (opcional)"
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Le tiene miedo a la tormenta, come 300 g de balanceado…"
              multiline
              style={styles.field}
            />
          </>
        )}

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
            variant="accent"
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
  field: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: poppinsWeight('600'),
    color: colors.ink,
    marginBottom: 8,
  },
  lockedTipo: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    fontSize: 14,
    fontFamily: poppinsWeight('600'),
    color: colors.textBody,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontSize: 16,
    fontFamily: poppinsWeight('600'),
    color: colors.textBody,
  },
  chipTextActive: {
    color: colors.onAccent,
  },
  formActions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
});
