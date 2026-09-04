import React, { useState } from 'react';
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
import ErrorBanner from '../components/ErrorBanner';
import DatePickerField, { formatDateOnly } from '../components/DatePickerField';
import PressScale from '../components/PressScale';
import { parseApiDate } from '../utils/displayFormat';

const TIPOS_INTEGRANTE = ['Adulto', 'Menor', 'Mayor'];
const TIPO_MIEMBRO_OPTIONS = [
  { label: 'Persona', value: 'integrante' },
  { label: 'Mascota', value: 'mascota' },
];

// 'adulto' -> 'Adulto' — inverso del .toLowerCase() que arma el payload al
// guardar; memberToEdit.tipo siempre llega en minúsculas (columna ENUM).
function capitalizarTipo(tipo) {
  if (!tipo) return 'Adulto';
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

export default function AddMemberScreen({ navigation, route }) {
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
  const [tipoIntegrante, setTipoIntegrante] = useState(() => capitalizarTipo(memberToEdit?.tipo));
  const [observaciones, setObservaciones] = useState(() => memberToEdit?.observaciones || '');

  // Campos de mascota
  const [especie, setEspecie] = useState(() => memberToEdit?.especie || '');
  const [raza, setRaza] = useState(() => memberToEdit?.raza || '');

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleGuardar() {
    const faltaNombre = !nombre.trim();
    const faltaApellido = tipoMiembro === 'integrante' && !apellido.trim();
    const faltaFechaNacimiento = tipoMiembro === 'integrante' && !fechaNacimiento;
    setNombreError(faltaNombre ? 'Este campo es obligatorio' : '');
    setApellidoError(faltaApellido ? 'Este campo es obligatorio' : '');
    setFechaNacimientoError(faltaFechaNacimiento ? 'Este campo es obligatorio' : '');
    setFormError('');

    if (faltaNombre || faltaApellido || faltaFechaNacimiento) return;

    setSaving(true);
    try {
      if (tipoMiembro === 'integrante') {
        // Enum de MySQL en minúsculas ('adulto'|'menor'|'mayor') — el picker
        // muestra las etiquetas capitalizadas, se convierte recién acá.
        const payload = {
          nombre,
          apellido,
          fecha_nacimiento: fechaNacimiento ? formatDateOnly(fechaNacimiento) : undefined,
          tipo: tipoIntegrante.toLowerCase(),
          observaciones: observaciones || undefined,
        };
        if (isEditing) {
          await api.patch(`/api/familia/integrantes/${memberToEdit.id}`, payload);
        } else {
          await api.post('/api/familia/integrantes', payload);
        }
      } else {
        const payload = {
          nombre,
          especie,
          raza: raza || undefined,
        };
        if (isEditing) {
          await api.patch(`/api/familia/mascotas/${memberToEdit.id}`, payload);
        } else {
          await api.post('/api/familia/mascotas', payload);
        }
      }

      await refresh();
      navigation.goBack();
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topbar}>
        <PressScale
          contentStyle={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Volver"
        >
          <Text style={styles.backBtnIcon}>‹</Text>
        </PressScale>
        <Text style={styles.topbarTitle}>
          {isEditing ? 'Editar' : 'Agregar a la familia'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
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
            onChange={setTipoMiembro}
          />
        )}

        <FormField
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
              label="Fecha de nacimiento"
              value={fechaNacimiento}
              onChange={(date) => {
                setFechaNacimiento(date);
                if (fechaNacimientoError) setFechaNacimientoError('');
              }}
              mode="date"
              maximumDate={new Date()}
              error={fechaNacimientoError}
              style={styles.field}
            />
            <View style={styles.field}>
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.chipRow}>
                {TIPOS_INTEGRANTE.map((tipo) => (
                  <PressScale
                    key={tipo}
                    contentStyle={[styles.chip, tipoIntegrante === tipo && styles.chipActive]}
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
                  </PressScale>
                ))}
              </View>
            </View>
            <FormField
              label="Observaciones"
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Alergias, condiciones, notas..."
              multiline
              style={styles.field}
            />
          </>
        ) : (
          <>
            <FormField
              label="Especie"
              value={especie}
              onChangeText={setEspecie}
              placeholder="Perro, gato, ave..."
              style={styles.field}
            />
            <FormField
              label="Raza"
              value={raza}
              onChangeText={setRaza}
              placeholder="Opcional"
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
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 16,
    // bgBase (no colors.glass, que ahora es blanco puro) — mismo criterio
    // que el resto de los headers, ver FamilyListScreen.js.
    backgroundColor: colors.bgBase,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
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
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
  // 100 (no 40) para despejar la tab bar flotante (position:'absolute' en
  // MainTabs) — mismo valor que CalendarScreen/FamilyListScreen.
  scroll: {
    paddingBottom: 100,
  },
  field: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
    marginBottom: 6,
  },
  lockedTipo: {
    marginHorizontal: 18,
    marginTop: 16,
    marginBottom: 16,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.onAccent,
  },
  formActions: {
    paddingHorizontal: 18,
    paddingTop: 6,
    gap: 10,
  },
});
