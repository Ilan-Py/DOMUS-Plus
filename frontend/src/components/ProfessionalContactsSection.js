import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonFilas } from './Skeleton';
import { colors, radii, cardBase } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import api, { getList } from '../api/client';
import PressScale from './PressScale';
import ErrorBanner from './ErrorBanner';
import InlineError from './InlineError';
import Ilustracion from './Ilustracion';
import FormField from './FormField';
import OptionPicker from './OptionPicker';

// Misma lista que valida el backend (profesionalSaludController.js).
const ESPECIALIDADES = [
  'Medicina general', 'Pediatría', 'Cardiología', 'Dermatología', 'Ginecología',
  'Traumatología', 'Oftalmología', 'Odontología', 'Psicología', 'Nutrición', 'Veterinario',
];
import PrimaryButton from './PrimaryButton';
import FadeSlideIn from './FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from './FadeOutRow';
import { confirmarDestructivo } from '../utils/confirm';

// `parentType` es 'integrante' o 'mascota' — mismo contrato de
// `${parentType}_id` que AttachmentsSection usa contra /api/adjuntos, acá
// contra /api/salud/profesionales (ver chk_profesional_un_padre en
// Scripts/05_emergencia.sql). Reusable tal cual en el perfil de una persona
// (pediatra/médico de cabecera) o de una mascota (veterinario) — sólo cambia
// la etiqueta visual, no la lógica.
// WhatsApp: número argentino a formato internacional (549 + área + número, sin 0 ni 15).
function enlaceWhatsApp(telefono) {
  let d = String(telefono || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  if (!d.startsWith('54')) d = `54${d}`;
  if (!d.startsWith('549')) d = `549${d.slice(2)}`;
  return `https://wa.me/${d}`;
}

export default function ProfessionalContactsSection({ parentType, parentId, nombreDueno }) {
  const esMascota = parentType === 'mascota';

  const [profesionales, setProfesionales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  // false | 'nuevo' | <id del profesional en edición>
  const [formAbierto, setFormAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [exitingId, setExitingId] = useState(null);

  const fetchProfesionales = useCallback(async () => {
    setError('');
    setLoadError(false);
    setLoading(true);
    try {
      const datos = await getList('/api/salud/profesionales', { params: { [`${parentType}_id`]: parentId } });
      setProfesionales(datos);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [parentType, parentId]);

  useEffect(() => {
    fetchProfesionales();
  }, [fetchProfesionales]);

  function abrirNuevo() {
    setNombre('');
    setEspecialidad('');
    setTelefono('');
    setDireccion('');
    setNotas('');
    setError('');
    setFormAbierto('nuevo');
  }

  function abrirEditar(item) {
    setNombre(item.nombre);
    setEspecialidad(item.especialidad || '');
    setTelefono(item.telefono || '');
    setDireccion(item.direccion || '');
    setNotas(item.notas || '');
    setError('');
    setFormAbierto(item.id);
  }

  async function guardar() {
    if (!nombre.trim()) return;
    setGuardando(true);
    setError('');
    try {
      const payload = {
        nombre: nombre.trim(),
        especialidad: especialidad || undefined,
        telefono: telefono || undefined,
        direccion: direccion || undefined,
        notas: notas || undefined,
      };
      if (formAbierto === 'nuevo') {
        await api.post('/api/salud/profesionales', { [`${parentType}_id`]: parentId, ...payload });
      } else {
        await api.patch(`/api/salud/profesionales/${formAbierto}`, payload);
      }
      setFormAbierto(false);
      await fetchProfesionales();
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(item) {
    setEliminandoId(item.id);
    setError('');
    try {
      await api.delete(`/api/salud/profesionales/${item.id}`);
      setExitingId(item.id);
      await new Promise((resolve) => setTimeout(resolve, EXIT_DURATION));
      await fetchProfesionales();
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setEliminandoId(null);
      setExitingId(null);
    }
  }

  function confirmEliminar(item) {
    confirmarDestructivo(`¿Eliminar a ${item.nombre}?`, 'Deja de aparecer en la ficha.', () => eliminar(item), `Eliminar a ${item.nombre.split(' ')[0]}`);
  }

  return (
    <View>
      <Text style={styles.titulo} accessibilityRole="header">
        {esMascota ? `Veterinario${nombreDueno ? ` de ${nombreDueno}` : ''}` : `Profesionales${nombreDueno ? ` de ${nombreDueno}` : ' de salud'}`}
      </Text>

      {loadError ? (
        <InlineError
          message={esMascota ? 'No pudimos cargar el veterinario.' : 'No pudimos cargar los profesionales.'}
          onRetry={fetchProfesionales}
        />
      ) : loading ? (
        <SkeletonFilas filas={2} />
      ) : (
        <>
          <ErrorBanner message={error} onDismiss={() => setError('')} />
          {profesionales.length === 0 && formAbierto !== 'nuevo' && (
            <View style={styles.emptyRow}>
              <Ilustracion nombre={esMascota ? 'veterinaria' : 'portapapeles'} size={88} />
              <View style={styles.emptyTextos}>
                <Text style={styles.emptyTitulo}>{esMascota ? `¿Quién cuida a ${nombreDueno || 'tu mascota'}?` : `¿Quién atiende a ${nombreDueno || 'esta persona'}?`}</Text>
                <Text style={styles.emptyText}>
                  {esMascota ? 'Agregá su veterinario: en una urgencia es lo primero que se busca.' : 'Agregá su médico de cabecera o sus especialistas, con el teléfono a mano.'}
                </Text>
              </View>
            </View>
          )}

          {profesionales.map((item, i) => (
            <FadeSlideIn key={item.id} index={i}>
              <FadeOutRow exiting={exitingId === item.id}>
                {formAbierto === item.id ? (
                  <ProfesionalForm
                    nombre={nombre} setNombre={setNombre}
                    especialidad={especialidad} setEspecialidad={setEspecialidad}
                    telefono={telefono} setTelefono={setTelefono}
                    direccion={direccion} setDireccion={setDireccion}
                    notas={notas} setNotas={setNotas}
                    onGuardar={guardar}
                    onCancelar={() => setFormAbierto(false)}
                    guardando={guardando}
                  />
                ) : (
                  <View style={[styles.item, i < profesionales.length - 1 && styles.itemDivider]}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemHeaderText}>
                        <Text style={styles.nombre}>{item.nombre}</Text>
                        {!!item.especialidad && <Text style={styles.meta}>{item.especialidad}</Text>}
                      </View>
                      <PressScale
                        contentStyle={styles.actionBtn}
                        onPress={() => abrirEditar(item)}
                        accessibilityLabel={`Editar ${item.nombre}`}
                      >
                        <Ionicons name="pencil-outline" size={20} color={colors.iconWarm} />
                      </PressScale>
                      <PressScale
                        contentStyle={styles.actionBtn}
                        onPress={() => confirmEliminar(item)}
                        disabled={eliminandoId === item.id}
                        accessibilityLabel={`Eliminar ${item.nombre}`}
                      >
                        {eliminandoId === item.id ? (
                          <ActivityIndicator size="small" color={colors.danger} />
                        ) : (
                          <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        )}
                      </PressScale>
                    </View>
                    {!!item.telefono && (
                      <View style={styles.contactoAcciones}>
                        <PressScale
                          contentStyle={styles.llamarBtn}
                          onPress={() => Linking.openURL(`tel:${item.telefono}`)}
                          accessibilityLabel={`Llamar a ${item.nombre}, ${item.telefono}`}
                        >
                          <Ionicons name="call" size={18} color="#FFFFFF" />
                          <Text style={styles.llamarTexto}>Llamar</Text>
                        </PressScale>
                        <PressScale
                          contentStyle={styles.whatsBtn}
                          onPress={() => Linking.openURL(enlaceWhatsApp(item.telefono))}
                          accessibilityLabel={`Escribirle por WhatsApp a ${item.nombre}`}
                        >
                          <Ionicons name="logo-whatsapp" size={18} color="#2F6B3A" />
                          <Text style={styles.whatsTexto}>WhatsApp</Text>
                        </PressScale>
                        <Text style={styles.callText}>{item.telefono}</Text>
                      </View>
                    )}
                    {!!item.direccion && <Text style={styles.meta}>{item.direccion}</Text>}
                    {!!item.notas && <Text style={styles.notas}>{item.notas}</Text>}
                  </View>
                )}
              </FadeOutRow>
            </FadeSlideIn>
          ))}

          {formAbierto === 'nuevo' ? (
            <ProfesionalForm
              nombre={nombre} setNombre={setNombre}
              especialidad={especialidad} setEspecialidad={setEspecialidad}
              telefono={telefono} setTelefono={setTelefono}
              direccion={direccion} setDireccion={setDireccion}
              notas={notas} setNotas={setNotas}
              onGuardar={guardar}
              onCancelar={() => setFormAbierto(false)}
              guardando={guardando}
            />
          ) : (
            <PressScale
              contentStyle={styles.addBtn}
              onPress={abrirNuevo}
              accessibilityLabel={esMascota ? 'Agregar veterinario' : 'Agregar profesional'}
            >
              <Ionicons name="add" size={20} color={colors.ink} />
              <Text style={styles.addText}>Agregar {esMascota ? 'veterinario' : 'profesional'}</Text>
            </PressScale>
          )}
        </>
      )}
    </View>
  );
}

function ProfesionalForm({
  nombre, setNombre, especialidad, setEspecialidad, telefono, setTelefono,
  direccion, setDireccion, notas, setNotas, onGuardar, onCancelar, guardando,
}) {
  return (
    <View style={styles.formCard}>
      <FormField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej. Dr. Juan Gómez" style={styles.field} />
      <OptionPicker
        label="Especialidad (opcional)"
        options={ESPECIALIDADES}
        value={especialidad}
        onChange={setEspecialidad}
        otherLabel="Otra"
        otherFieldLabel="¿Cuál especialidad?"
        otherPlaceholder="Ej. Fonoaudiología"
        style={styles.field}
      />
      <FormField label="Teléfono (opcional)" value={telefono} onChangeText={setTelefono} placeholder="Ej. 11 5555 5555" keyboardType="phone-pad" style={styles.field} />
      <FormField label="Dirección (opcional)" value={direccion} onChangeText={setDireccion} placeholder="Ej. Av. Siempre Viva 123" style={styles.field} />
      <FormField label="Notas (opcional)" value={notas} onChangeText={setNotas} multiline style={styles.field} />
      <View style={styles.formActions}>
        <PrimaryButton title="Guardar" onPress={onGuardar} loading={guardando} variant="accent" />
        <PrimaryButton title="Cancelar" onPress={onCancelar} variant="secondary" disabled={guardando} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontSize: 16,
    fontFamily: poppinsWeight('700'),
    color: colors.ink,
    marginBottom: 12,
  },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' },
  emptyTextos: { flex: 1, minWidth: 180, gap: 4 },
  emptyTitulo: { fontSize: 18, lineHeight: 24, fontFamily: 'Lora_700Bold', color: colors.ink },
  contactoAcciones: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  llamarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#C24623' },
  llamarTexto: { color: '#FFFFFF', fontSize: 15, fontFamily: poppinsWeight('600') },
  whatsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: '#2F6B3A' },
  whatsTexto: { color: '#2F6B3A', fontSize: 15, fontFamily: poppinsWeight('600') },
  emptyText: { flex: 1, fontSize: 16, color: colors.textBody },
  loading: { alignSelf: 'flex-start', marginVertical: 8 },
  item: { paddingVertical: 8, gap: 4 },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderCard, marginBottom: 4 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemHeaderText: { flex: 1 },
  nombre: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  meta: { fontSize: 15, lineHeight: 22, color: colors.textBody },
  notas: { fontSize: 15, lineHeight: 22, color: colors.textBody, marginTop: 4 },
  actionBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  // Subrayado: es un enlace (tel:). Verde para consulta común; la urgencia usa terracota.
  callText: { fontVariant: ['tabular-nums'],
    fontSize: 17,
    fontFamily: poppinsWeight('600'),
    color: colors.sageDeep,
    textDecorationLine: 'underline',
  },
  // Botón secundario de ancho completo al pie.
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.glassStrong,
  },
  addText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  formCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.bgBase,
  },
  field: { paddingBottom: 16 },
  formActions: { gap: 12 },
});
