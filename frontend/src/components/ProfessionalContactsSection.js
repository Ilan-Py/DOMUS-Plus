import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, cardBase } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import api, { getList } from '../api/client';
import PressScale from './PressScale';
import ErrorBanner from './ErrorBanner';
import FormField from './FormField';
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
export default function ProfessionalContactsSection({ parentType, parentId }) {
  const esMascota = parentType === 'mascota';

  const [profesionales, setProfesionales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    try {
      const datos = await getList('/api/salud/profesionales', { params: { [`${parentType}_id`]: parentId } });
      setProfesionales(datos);
    } catch (err) {
      setError(err.mensaje);
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
    confirmarDestructivo('Eliminar', `¿Seguro que querés eliminar a ${item.nombre}?`, () => eliminar(item));
  }

  return (
    <View style={styles.root}>
      <Text style={styles.titulo}>{esMascota ? 'Veterinario' : 'Profesionales de salud'}</Text>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <ActivityIndicator color={colors.textMuted} style={styles.loading} />
      ) : (
        <>
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
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderText}>
                        <Text style={styles.nombre}>{item.nombre}</Text>
                        {!!item.especialidad && <Text style={styles.meta}>{item.especialidad}</Text>}
                      </View>
                      <PressScale
                        contentStyle={styles.actionBtn}
                        onPress={() => abrirEditar(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Editar ${item.nombre}`}
                      >
                        <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
                      </PressScale>
                      <PressScale
                        contentStyle={styles.actionBtn}
                        onPress={() => confirmEliminar(item)}
                        disabled={eliminandoId === item.id}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Eliminar ${item.nombre}`}
                      >
                        {eliminandoId === item.id ? (
                          <ActivityIndicator size="small" color={colors.danger} />
                        ) : (
                          <Ionicons name="trash-outline" size={14} color={colors.danger} />
                        )}
                      </PressScale>
                    </View>
                    {!!item.telefono && (
                      <PressScale
                        contentStyle={styles.callRow}
                        onPress={() => Linking.openURL(`tel:${item.telefono}`)}
                        accessibilityLabel={`Llamar a ${item.nombre}`}
                      >
                        <Ionicons name="call" size={13} color={colors.sageDeep} />
                        <Text style={styles.callText}>{item.telefono}</Text>
                      </PressScale>
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
              <Ionicons name="add" size={16} color={colors.textMuted} />
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
      <FormField label="Especialidad (opcional)" value={especialidad} onChangeText={setEspecialidad} placeholder="Ej. Pediatría" style={styles.field} />
      <FormField label="Teléfono (opcional)" value={telefono} onChangeText={setTelefono} placeholder="Ej. 11 5555 5555" keyboardType="phone-pad" style={styles.field} />
      <FormField label="Dirección (opcional)" value={direccion} onChangeText={setDireccion} placeholder="Ej. Av. Siempre Viva 123" style={styles.field} />
      <FormField label="Notas (opcional)" value={notas} onChangeText={setNotas} multiline style={styles.field} />
      <View style={styles.formActions}>
        <PrimaryButton title="Guardar" onPress={onGuardar} loading={guardando} variant="success" fullWidth={false} />
        <PrimaryButton title="Cancelar" onPress={onCancelar} variant="secondary" fullWidth={false} disabled={guardando} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 12,
  },
  titulo: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  loading: {
    marginVertical: 10,
  },
  card: {
    padding: 12,
    marginBottom: 8,
    ...cardBase,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  cardHeaderText: {
    flex: 1,
  },
  nombre: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
  meta: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  notas: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  callText: {
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.sageDeep,
    textDecorationLine: 'underline',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.input,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  addText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
  },
  formCard: {
    padding: 14,
    marginBottom: 8,
    ...cardBase,
  },
  field: {
    paddingBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
