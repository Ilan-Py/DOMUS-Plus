import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, cardBase } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import api, { getList } from '../api/client';
import { useFamily } from '../context/FamilyContext';
import ScreenHeader from '../components/ScreenHeader';
import PressScale from '../components/PressScale';
import PrimaryButton from '../components/PrimaryButton';
import FormField from '../components/FormField';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import FadeSlideIn from '../components/FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from '../components/FadeOutRow';
import { confirmarDestructivo } from '../utils/confirm';

// alergias/tipo_sangre/notas_emergencia ya vienen en el mismo
// /api/familia/integrantes que alimenta FamilyContext (ver SELECT ampliado
// en familiaController.listarIntegrantes) — se lee de ahí en vez de pedir un
// GET aparte, mismo criterio que ProfileDetailScreen usa para `member`.
// refresh() (post-PATCH) es lo que mantiene esto al día sin duplicar fetch.
export default function EmergencyScreen({ navigation, route }) {
  const { id, nombre: nombreParam } = route.params;
  const { integrantes, refresh } = useFamily();
  const integrante = integrantes.find((i) => i.id === id);
  const nombre = integrante ? `${integrante.nombre} ${integrante.apellido}` : nombreParam || '';

  const [editing, setEditing] = useState(false);
  const [alergias, setAlergias] = useState('');
  const [tipoSangre, setTipoSangre] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [contactos, setContactos] = useState([]);
  const [loadingContactos, setLoadingContactos] = useState(true);
  // false | 'nuevo' | <id del contacto en edición>
  const [formAbierto, setFormAbierto] = useState(false);
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [contactoRelacion, setContactoRelacion] = useState('');
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [exitingId, setExitingId] = useState(null);

  const fetchContactos = useCallback(async () => {
    try {
      const datos = await getList(`/api/familia/integrantes/${id}/contactos-emergencia`);
      setContactos(datos);
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setLoadingContactos(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContactos();
  }, [fetchContactos]);

  function iniciarEdicion() {
    setAlergias(integrante?.alergias || '');
    setTipoSangre(integrante?.tipo_sangre || '');
    setNotas(integrante?.notas_emergencia || '');
    setError('');
    setEditing(true);
  }

  async function guardarEmergencia() {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/api/familia/integrantes/${id}/emergencia`, {
        alergias: alergias || null,
        tipo_sangre: tipoSangre || null,
        notas_emergencia: notas || null,
      });
      await refresh();
      setEditing(false);
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setSaving(false);
    }
  }

  function abrirNuevoContacto() {
    setContactoNombre('');
    setContactoTelefono('');
    setContactoRelacion('');
    setError('');
    setFormAbierto('nuevo');
  }

  function abrirEditarContacto(item) {
    setContactoNombre(item.nombre);
    setContactoTelefono(item.telefono);
    setContactoRelacion(item.relacion || '');
    setError('');
    setFormAbierto(item.id);
  }

  async function guardarContacto() {
    if (!contactoNombre.trim() || !contactoTelefono.trim()) return;
    setGuardandoContacto(true);
    setError('');
    try {
      const payload = {
        nombre: contactoNombre.trim(),
        telefono: contactoTelefono.trim(),
        relacion: contactoRelacion || undefined,
      };
      if (formAbierto === 'nuevo') {
        await api.post(`/api/familia/integrantes/${id}/contactos-emergencia`, payload);
      } else {
        await api.patch(`/api/familia/contactos-emergencia/${formAbierto}`, payload);
      }
      setFormAbierto(false);
      await fetchContactos();
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setGuardandoContacto(false);
    }
  }

  async function eliminarContacto(item) {
    setEliminandoId(item.id);
    setError('');
    try {
      await api.delete(`/api/familia/contactos-emergencia/${item.id}`);
      setExitingId(item.id);
      await new Promise((resolve) => setTimeout(resolve, EXIT_DURATION));
      await fetchContactos();
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setEliminandoId(null);
      setExitingId(null);
    }
  }

  function confirmEliminarContacto(item) {
    confirmarDestructivo(
      'Eliminar contacto',
      `¿Seguro que querés eliminar a ${item.nombre} de los contactos de emergencia?`,
      () => eliminarContacto(item)
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={nombre}
        subtitle="Ficha de emergencia"
        onBack={() => navigation.goBack()}
        rightActions={
          !editing ? (
            <PressScale
              contentStyle={styles.topbarIconBtn}
              onPress={iniciarEdicion}
              hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
              accessibilityLabel="Editar ficha de emergencia"
            >
              <Ionicons name="pencil-outline" size={18} color={colors.navy} />
            </PressScale>
          ) : null
        }
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {!!error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Datos médicos</Text>
            {editing ? (
              <>
                <FormField label="Alergias" value={alergias} onChangeText={setAlergias} placeholder="Ej. Penicilina, maní" multiline style={styles.field} />
                <FormField label="Tipo de sangre" value={tipoSangre} onChangeText={setTipoSangre} placeholder="Ej. O+" autoCapitalize="characters" style={styles.field} />
                <FormField label="Notas de emergencia" value={notas} onChangeText={setNotas} placeholder="Condiciones crónicas, medicación habitual, etc." multiline style={styles.field} />
                <View style={styles.formActions}>
                  <PrimaryButton title="Guardar" onPress={guardarEmergencia} loading={saving} variant="success" />
                  <PrimaryButton title="Cancelar" onPress={() => setEditing(false)} variant="secondary" disabled={saving} />
                </View>
              </>
            ) : (
              <>
                <DatoRow label="Alergias" valor={integrante?.alergias} />
                <DatoRow label="Tipo de sangre" valor={integrante?.tipo_sangre} />
                <DatoRow label="Notas" valor={integrante?.notas_emergencia} />
              </>
            )}
          </View>

          <Text style={styles.titulo}>Contactos de emergencia</Text>
          {loadingContactos ? (
            <ActivityIndicator color={colors.textMuted} style={styles.loading} />
          ) : (
            <>
              {contactos.length === 0 && formAbierto !== 'nuevo' && (
                <EmptyState message="No hay contactos de emergencia cargados." />
              )}

              {contactos.map((item, i) => (
                <FadeSlideIn key={item.id} index={i}>
                  <FadeOutRow exiting={exitingId === item.id}>
                    {formAbierto === item.id ? (
                      <ContactForm
                        nombre={contactoNombre} setNombre={setContactoNombre}
                        telefono={contactoTelefono} setTelefono={setContactoTelefono}
                        relacion={contactoRelacion} setRelacion={setContactoRelacion}
                        onGuardar={guardarContacto}
                        onCancelar={() => setFormAbierto(false)}
                        guardando={guardandoContacto}
                      />
                    ) : (
                      <View style={styles.contactCard}>
                        <PressScale
                          style={styles.flex}
                          contentStyle={styles.contactTapArea}
                          onPress={() => Linking.openURL(`tel:${item.telefono}`)}
                          accessibilityLabel={`Llamar a ${item.nombre}`}
                        >
                          <View style={styles.contactPhoneIcon}>
                            <Ionicons name="call" size={16} color={colors.onAccent} />
                          </View>
                          <View style={styles.flex}>
                            <Text style={styles.contactNombre}>{item.nombre}</Text>
                            <Text style={styles.contactMeta}>
                              {item.relacion ? `${item.relacion} · ` : ''}{item.telefono}
                            </Text>
                          </View>
                        </PressScale>
                        <PressScale
                          contentStyle={styles.contactActionBtn}
                          onPress={() => abrirEditarContacto(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel={`Editar contacto ${item.nombre}`}
                        >
                          <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
                        </PressScale>
                        <PressScale
                          contentStyle={styles.contactActionBtn}
                          onPress={() => confirmEliminarContacto(item)}
                          disabled={eliminandoId === item.id}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel={`Eliminar contacto ${item.nombre}`}
                        >
                          {eliminandoId === item.id ? (
                            <ActivityIndicator size="small" color={colors.danger} />
                          ) : (
                            <Ionicons name="trash-outline" size={14} color={colors.danger} />
                          )}
                        </PressScale>
                      </View>
                    )}
                  </FadeOutRow>
                </FadeSlideIn>
              ))}

              {formAbierto === 'nuevo' ? (
                <ContactForm
                  nombre={contactoNombre} setNombre={setContactoNombre}
                  telefono={contactoTelefono} setTelefono={setContactoTelefono}
                  relacion={contactoRelacion} setRelacion={setContactoRelacion}
                  onGuardar={guardarContacto}
                  onCancelar={() => setFormAbierto(false)}
                  guardando={guardandoContacto}
                />
              ) : (
                <PressScale contentStyle={styles.addContactBtn} onPress={abrirNuevoContacto} accessibilityLabel="Agregar contacto de emergencia">
                  <Ionicons name="add" size={18} color={colors.textMuted} />
                  <Text style={styles.addContactText}>Agregar contacto</Text>
                </PressScale>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function DatoRow({ label, valor }) {
  return (
    <View style={styles.datoRow}>
      <Text style={styles.datoLabel}>{label}</Text>
      <Text style={styles.datoValor}>{valor || '—'}</Text>
    </View>
  );
}

function ContactForm({
  nombre, setNombre, telefono, setTelefono, relacion, setRelacion, onGuardar, onCancelar, guardando,
}) {
  return (
    <View style={styles.contactFormCard}>
      <FormField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej. Ana Pérez" style={styles.field} />
      <FormField label="Teléfono" value={telefono} onChangeText={setTelefono} placeholder="Ej. 11 5555 5555" keyboardType="phone-pad" style={styles.field} />
      <FormField label="Relación (opcional)" value={relacion} onChangeText={setRelacion} placeholder="Ej. Madre, vecino" style={styles.field} />
      <View style={styles.formActions}>
        <PrimaryButton title="Guardar" onPress={onGuardar} loading={guardando} variant="success" fullWidth={false} />
        <PrimaryButton title="Cancelar" onPress={onCancelar} variant="secondary" fullWidth={false} disabled={guardando} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  flex: {
    flex: 1,
  },
  topbarIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    padding: 14,
    marginBottom: 20,
    ...cardBase,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  field: {
    paddingBottom: 14,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  datoRow: {
    marginBottom: 10,
  },
  datoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  datoValor: {
    fontSize: 14.5,
    fontWeight: '500',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
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
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    gap: 6,
    ...cardBase,
  },
  // Sin flex:1 acá a propósito — ese flex vive en el `style` del PressScale
  // (el Pressable real, que participa del flexbox de contactCard), no en
  // contentStyle (el Animated.View interno). Ponerlo acá causaba que Yoga
  // resolviera la altura contra un contenedor sin tamaño definido y la fila
  // se estirara a cientos de px de alto — bug real encontrado en la prueba
  // en dispositivo, no sólo estético.
  contactTapArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactPhoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.sageDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactNombre: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
  contactMeta: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  contactActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: radii.input,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: colors.line,
    marginTop: 4,
  },
  addContactText: {
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
  },
  contactFormCard: {
    padding: 14,
    marginBottom: 8,
    ...cardBase,
  },
});
