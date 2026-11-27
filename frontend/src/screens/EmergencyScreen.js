import React, { useCallback, useEffect, useState } from 'react';
import useColumnInset from '../hooks/useColumnInset';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
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
import OptionPicker from '../components/OptionPicker';

// Listas cerradas — mismas que valida el backend (familiaController.js).
const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ALERGIAS_FRECUENTES = [
  'Penicilina', 'AINEs', 'Maní', 'Frutos secos', 'Mariscos', 'Lácteos',
  'Huevo', 'Gluten', 'Polen', 'Ácaros', 'Látex', 'Picadura de abeja',
];

function listaDeAlergias(texto) {
  return (texto || '').split(',').map((a) => a.trim()).filter(Boolean);
}

// alergias/tipo_sangre/notas_emergencia ya vienen en el mismo
// /api/familia/integrantes que alimenta FamilyContext (ver SELECT ampliado
// en familiaController.listarIntegrantes) — se lee de ahí en vez de pedir un
// GET aparte, mismo criterio que ProfileDetailScreen usa para `member`.
// refresh() (post-PATCH) es lo que mantiene esto al día sin duplicar fetch.
export default function EmergencyScreen({ navigation, route }) {
  const inset = useColumnInset();
  const { id, nombre: nombreParam } = route.params;
  const { integrantes, refresh } = useFamily();
  const integrante = integrantes.find((i) => i.id === id);
  const nombre = integrante ? `${integrante.nombre} ${integrante.apellido}` : nombreParam || '';

  const { width } = useWindowDimensions();
  const columnas = width >= 768; // dos columnas (sangre | alergias) en escritorio
  const angosto = width < 600; // en pantallas angostas "Editar ficha" va debajo del título
  const sangre = integrante?.tipo_sangre;
  const listaAlergias = listaDeAlergias(integrante?.alergias);
  const notasGuardadas = integrante?.notas_emergencia;
  const sinDatos = !sangre && listaAlergias.length === 0 && !notasGuardadas;
  const [editing, setEditing] = useState(false);
  const [alergias, setAlergias] = useState([]);
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
    setAlergias(listaDeAlergias(integrante?.alergias));
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
        alergias: alergias.length ? alergias.join(', ') : null,
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
          !editing && !angosto ? (
            <PressScale
              contentStyle={styles.editFichaBtn}
              onPress={iniciarEdicion}
              accessibilityLabel="Editar ficha de emergencia"
            >
              <Ionicons name="pencil-outline" size={20} color={colors.iconWarm} />
              <Text style={styles.editFichaText}>Editar ficha</Text>
            </PressScale>
          ) : null
        }
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: 20 + inset }]}>
          {!!error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

          {!editing && angosto && (
            <PressScale
              contentStyle={[styles.editFichaBtn, styles.editFichaBlock]}
              onPress={iniciarEdicion}
              accessibilityLabel="Editar ficha de emergencia"
            >
              <Ionicons name="pencil-outline" size={20} color={colors.iconWarm} />
              <Text style={styles.editFichaText}>Editar ficha</Text>
            </PressScale>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Datos médicos</Text>
            {editing ? (
              <>
                <OptionPicker
                  label="Alergias"
                  options={ALERGIAS_FRECUENTES}
                  value={alergias}
                  onChange={setAlergias}
                  multiple
                  otherLabel="Otras"
                  otherFieldLabel="¿Cuáles otras?"
                  otherPlaceholder="Ej. Ibuprofeno, Kiwi (separadas por coma)"
                  style={styles.field}
                />
                <OptionPicker
                  label="Tipo de sangre"
                  options={GRUPOS_SANGUINEOS}
                  value={tipoSangre}
                  onChange={setTipoSangre}
                  style={styles.field}
                />
                <FormField label="Notas de emergencia" value={notas} onChangeText={setNotas} placeholder="Condiciones crónicas, medicación habitual, etc." multiline style={styles.field} />
                <View style={styles.formActions}>
                  <PrimaryButton title="Guardar" onPress={guardarEmergencia} loading={saving} variant="accent" />
                  <PrimaryButton title="Cancelar" onPress={() => setEditing(false)} variant="secondary" disabled={saving} />
                </View>
              </>
            ) : (
              <>
                <View style={[styles.medTop, columnas && styles.medTopRow]}>
                  {/* Tipo de sangre: caja destacada; rosada sólo si hay dato. */}
                  <View style={[styles.bloodBox, columnas && styles.bloodCol, !sangre && styles.bloodBoxEmpty]}>
                    <Text style={styles.medLabel}>Tipo de sangre</Text>
                    {sangre ? (
                      <Text style={styles.bloodValue}>{sangre}</Text>
                    ) : (
                      <Text style={styles.emptyText}>Sin cargar</Text>
                    )}
                  </View>

                  <View style={columnas && styles.allergyCol}>
                    <Text style={styles.medLabel}>Alergias</Text>
                    {listaAlergias.length === 0 ? (
                      <Text style={styles.emptyText}>Sin cargar</Text>
                    ) : (
                      <View style={styles.chips}>
                        {listaAlergias.map((t) => (
                          <View key={t} style={styles.chip}>
                            <Text style={styles.chipText}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.notesBlock}>
                  <Text style={styles.medLabel}>Notas médicas</Text>
                  {notasGuardadas ? (
                    <Text style={styles.notesText}>{notasGuardadas}</Text>
                  ) : (
                    <Text style={styles.emptyText}>Sin cargar</Text>
                  )}
                </View>

                {sinDatos && (
                  <PressScale contentStyle={styles.secondaryBtn} onPress={iniciarEdicion} accessibilityLabel="Completar datos médicos">
                    <Text style={styles.secondaryBtnText}>Completar datos médicos</Text>
                  </PressScale>
                )}
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
                            <Ionicons name="call" size={20} color={colors.accentStrong} />
                          </View>
                          <View style={styles.flex}>
                            <Text style={styles.contactNombre}>
                              {item.nombre}
                              {item.relacion ? <Text style={styles.contactMeta}>{`  ·  ${item.relacion}`}</Text> : null}
                            </Text>
                            <Text style={styles.contactPhone}>{item.telefono}</Text>
                          </View>
                        </PressScale>
                        <ContactAction
                          icon="pencil-outline"
                          label={`Editar contacto ${item.nombre}`}
                          onPress={() => abrirEditarContacto(item)}
                        />
                        <ContactAction
                          icon="trash-outline"
                          label={`Eliminar contacto ${item.nombre}`}
                          onPress={() => confirmEliminarContacto(item)}
                          disabled={eliminandoId === item.id}
                          loading={eliminandoId === item.id}
                          danger
                        />
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
                <PressScale contentStyle={styles.secondaryBtn} onPress={abrirNuevoContacto} accessibilityLabel="Agregar contacto de emergencia">
                  <Ionicons name="add" size={20} color={colors.ink} />
                  <Text style={styles.secondaryBtnText}>Agregar contacto</Text>
                </PressScale>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Ícono de editar / eliminar de un contacto: gris cálido neutro con área de 48dp;
// el de eliminar pasa a rojo recién al pasar el mouse (o presionar).
function ContactAction({ icon, label, onPress, disabled, loading, danger }) {
  const [activo, setActivo] = useState(false);
  const color = danger && activo ? colors.danger : colors.iconWarm;
  return (
    <PressScale
      contentStyle={[styles.contactActionBtn, activo && styles.contactActionActive]}
      onPress={onPress}
      onPressedChange={setActivo}
      onHoverIn={() => setActivo(true)}
      onHoverOut={() => setActivo(false)}
      disabled={disabled}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.danger} />
      ) : (
        <Ionicons name={icon} size={20} color={color} />
      )}
    </PressScale>
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
        <PrimaryButton title="Guardar" onPress={onGuardar} loading={guardando} variant="accent" />
        <PrimaryButton title="Cancelar" onPress={onCancelar} variant="secondary" disabled={guardando} />
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
  editFichaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  editFichaBlock: { justifyContent: 'center', marginBottom: 16 },
  editFichaText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    padding: 16,
    marginBottom: 20,
    ...cardBase,
    borderRadius: 16,
    borderColor: colors.borderCard,
    shadowOpacity: 0,
    elevation: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: poppinsWeight('700'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  field: {
    paddingBottom: 16,
  },
  formActions: {
    gap: 12,
    marginTop: 8,
  },
  medTop: { gap: 16 },
  medTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bloodBox: { borderRadius: 10, padding: 16, backgroundColor: colors.bloodBg },
  bloodBoxEmpty: { backgroundColor: colors.emptyBg },
  bloodCol: { flex: 35 },
  allergyCol: { flex: 65 },
  medLabel: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.textBody, marginBottom: 8 },
  bloodValue: { fontSize: 32, lineHeight: 40, fontFamily: poppinsWeight('700'), color: colors.bloodText },
  emptyText: { fontSize: 16, lineHeight: 22, color: colors.textEmpty },
  notesBlock: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EFE8DF' },
  notesText: { fontSize: 16, lineHeight: 24, color: colors.ink },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.glassStrong,
  },
  secondaryBtnText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  contactActionActive: { backgroundColor: colors.badgeSand },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.badgeSand,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  chipText: {
    fontSize: 16,
    fontFamily: poppinsWeight('600'),
    color: colors.badgeSandText,
  },
  titulo: {
    fontSize: 14,
    fontFamily: poppinsWeight('700'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  loading: {
    marginVertical: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    gap: 8,
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
    gap: 12,
  },
  contactPhoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bloodBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactNombre: {
    fontSize: 16,
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
  contactPhone: { fontVariant: ['tabular-nums'],
    fontSize: 20,
    lineHeight: 28,
    fontFamily: poppinsWeight('600'),
    color: colors.accentStrong,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  contactMeta: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 0,
  },
  contactActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactFormCard: {
    padding: 16,
    marginBottom: 8,
    ...cardBase,
  },
});
