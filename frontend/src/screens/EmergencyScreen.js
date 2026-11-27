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
import { paper } from '../theme/paper';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import api, { getList } from '../api/client';
import { useFamily } from '../context/FamilyContext';
import Avatar from '../components/Avatar';
import CrossfadeIcon from '../components/CrossfadeIcon';
import { mostrarToast } from '../components/ToastHost';
import * as Clipboard from 'expo-clipboard';
import { formatearTelefono } from '../utils/displayFormat';
import { layout } from '../theme/spacing';
import PressScale from '../components/PressScale';
import PrimaryButton from '../components/PrimaryButton';
import FormField from '../components/FormField';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import { SkeletonFilas } from '../components/Skeleton';
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
  const columnas = width >= 768; // dos columnas (sangre 1/3 | alergias 2/3) en escritorio
  const angosto = width < 600; // en pantallas angostas el botón de copiar queda sólo con ícono
  const sangre = integrante?.tipo_sangre;
  const listaAlergias = listaDeAlergias(integrante?.alergias);
  const notasGuardadas = integrante?.notas_emergencia;
  const sinDatos = !sangre && listaAlergias.length === 0 && !notasGuardadas;
  const [editing, setEditing] = useState(false);
  const [copiado, setCopiado] = useState(false);
  // Qué se está editando: 'todos' (botón Editar) o un solo dato (clic en su espacio vacío).
  const [campoEdit, setCampoEdit] = useState('todos');
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

  function iniciarEdicion(campo = 'todos') {
    setCampoEdit(campo);
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

  // Resumen en texto plano, listo para pegar en WhatsApp o guardar en notas.
  async function copiarResumen() {
    const lineas = [`Ficha de emergencia: ${nombre}`, ''];
    lineas.push(`Tipo de sangre: ${sangre || 'sin cargar'}`);
    lineas.push(`Alergias: ${listaAlergias.length ? listaAlergias.join(', ') : 'sin cargar'}`);
    if (notasGuardadas) lineas.push(`Notas: ${notasGuardadas}`);
    if (contactos.length) {
      lineas.push('', 'Contactos de emergencia:');
      contactos.forEach((c) =>
        lineas.push(`- ${c.nombre}${c.relacion ? ` (${c.relacion})` : ''}: ${formatearTelefono(c.telefono)}`)
      );
    }
    lineas.push('', 'Generado con DOMUS+');
    await Clipboard.setStringAsync(lineas.join('\n'));
    setCopiado(true);
    mostrarToast('Resumen copiado');
    setTimeout(() => setCopiado(false), 1500);
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
      {/* Encabezado: Volver como migas de pan arriba; debajo, de quién es la ficha, grande y con su avatar. */}
      <View style={[styles.cabecera, { paddingHorizontal: 20 + inset }]}>
        <PressScale contentStyle={styles.volver} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={20} color={colors.textBody} />
          <Text style={styles.volverText}>Volver</Text>
        </PressScale>
        <View style={styles.cabeceraFila}>
          <Avatar
            nombre={integrante?.nombre || nombre}
            apellido={integrante?.apellido}
            tipo={integrante?.tipo}
            fotoUrl={integrante?.foto_url}
            size={64}
          />
          <View style={styles.flex}>
            <Text style={styles.nombre} accessibilityRole="header" numberOfLines={2}>{nombre}</Text>
            <Text style={styles.subtitulo}>Ficha de emergencia</Text>
          </View>
          <PressScale
            contentStyle={[styles.copiarBtn, angosto && styles.copiarBtnSolo]}
            onPress={copiarResumen}
            accessibilityLabel="Copiar resumen de la ficha"
          >
            <CrossfadeIcon a="copy-outline" b="checkmark" showB={copiado} size={20} color={colors.ink} />
            {!angosto && <Text style={styles.copiarText}>{copiado ? 'Copiado' : 'Copiar resumen'}</Text>}
          </PressScale>
        </View>
        <View style={[styles.cabeceraLinea, { left: 18 + inset, right: 18 + inset }]} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: 20 + inset }]}>
          {!!error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

          {/* Ficha de cartulina: borde superior terracota, sombra de papel en dos capas y una hoja
              apenas asomando detrás. Sin giros ni animaciones: es una ficha clínica, se lee primero. */}
          <View style={styles.fichaWrap}>
            <View style={styles.hojaDetras} pointerEvents="none" />
            <View {...paper('ficha')} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Datos médicos</Text>
              {/* Un solo Editar, en la tarjeta, y sólo cuando ya hay algún dato cargado */}
              {!editing && !sinDatos && (
                <PressScale
                  contentStyle={styles.editarBtn}
                  onPress={() => iniciarEdicion('todos')}
                  accessibilityLabel="Editar datos médicos"
                >
                  <Ionicons name="pencil-outline" size={18} color={colors.iconWarm} />
                  <Text style={styles.editarText}>Editar</Text>
                </PressScale>
              )}
            </View>
            {editing ? (
              <>
                {(campoEdit === 'todos' || campoEdit === 'alergias') && (
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
                )}
                {(campoEdit === 'todos' || campoEdit === 'sangre') && (
                <OptionPicker
                  label="Tipo de sangre"
                  options={GRUPOS_SANGUINEOS}
                  value={tipoSangre}
                  onChange={setTipoSangre}
                  style={styles.field}
                />
                )}
                {(campoEdit === 'todos' || campoEdit === 'notas') && (
                <FormField label="Notas de emergencia" value={notas} onChangeText={setNotas} placeholder="Condiciones crónicas, medicación habitual, etc." multiline style={styles.field} />
                )}
                <View style={styles.formActions}>
                  <PrimaryButton title="Guardar" onPress={guardarEmergencia} loading={saving} variant="accent" />
                  <PrimaryButton title="Cancelar" onPress={() => setEditing(false)} variant="secondary" disabled={saving} />
                </View>
              </>
            ) : (
              <>
                <View style={[styles.medTop, columnas && styles.medTopRow]}>
                  {/* Tipo de sangre: caja destacada si hay dato; si no, un espacio para completar. */}
                  {sangre ? (
                    <View style={[styles.bloodBox, columnas && styles.bloodCol]}>
                      <Text style={styles.medLabel}>Tipo de sangre</Text>
                      <Text style={styles.bloodValue}>{sangre}</Text>
                    </View>
                  ) : (
                    <View style={columnas && styles.bloodCol}>
                      <Text style={styles.medLabel}>Tipo de sangre</Text>
                      <EspacioVacio texto="Agregar tipo de sangre" onPress={() => iniciarEdicion('sangre')} />
                    </View>
                  )}

                  <View style={columnas && styles.allergyCol}>
                    <Text style={styles.medLabel}>Alergias</Text>
                    {listaAlergias.length === 0 ? (
                      <EspacioVacio texto="Agregar alergias" onPress={() => iniciarEdicion('alergias')} />
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
                    <EspacioVacio texto="Agregar notas" onPress={() => iniciarEdicion('notas')} />
                  )}
                </View>
              </>
            )}
            </View>
          </View>

          <Text style={styles.titulo}>Contactos de emergencia</Text>
          {loadingContactos ? (
            <SkeletonFilas filas={2} />
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
                      <View {...paper('carton')} style={styles.contactCard}>
                        <PressScale
                          style={styles.flex}
                          contentStyle={styles.contactTapArea}
                          onPress={() => Linking.openURL(`tel:${item.telefono}`)}
                          accessibilityLabel={`Llamar a ${item.nombre}`}
                        >
                          <View style={styles.contactPhoneIcon}>
                            <Ionicons name="call" size={22} color={colors.onAccent} />
                          </View>
                          <View style={styles.flex}>
                            <Text style={styles.contactNombre}>
                              {item.nombre}
                              {item.relacion ? <Text style={styles.contactMeta}>{`  ·  ${item.relacion}`}</Text> : null}
                            </Text>
                            <Text style={styles.contactPhone}>{formatearTelefono(item.telefono)}</Text>
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
                  <Ionicons name="add" size={20} color={colors.accentStrong} />
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

// Espacio para completar: borde punteado suave y texto accionable. Un clic abre ese dato.
function EspacioVacio({ texto, onPress }) {
  return (
    <PressScale
      contentStyle={styles.espacioVacio}
      onPress={onPress}
      accessibilityLabel={texto}
    >
      <Ionicons name="add" size={20} color={colors.accentStrong} />
      <Text style={styles.espacioVacioText}>{texto}</Text>
    </PressScale>
  );
}

// Ícono de editar / eliminar de un contacto: gris cálido neutro con área de 48dp;
// el de eliminar pasa a rojo recién al pasar el mouse (o presionar).
function ContactAction({ icon, label, onPress, disabled, loading, danger }) {
  const [activo, setActivo] = useState(false);
  const color = danger && activo ? colors.danger : colors.iconWarm;
  return (
    <PressScale
      contentStyle={[
        styles.contactActionBtn,
        activo && (danger ? styles.contactActionDanger : styles.contactActionActive),
      ]}
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
        <Ionicons name={icon} size={22} color={color} />
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
  cabecera: { paddingTop: layout.screenTopPadding, paddingBottom: 16, backgroundColor: colors.bgBase, gap: 8 },
  volver: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, minHeight: 44, paddingRight: 12 },
  volverText: { fontSize: 15, fontFamily: poppinsWeight('500'), color: colors.textBody },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nombre: { fontSize: 28, lineHeight: 36, fontFamily: SERIF_BOLD, color: colors.ink },
  subtitulo: { fontSize: 15, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.accentStrong },
  copiarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  copiarBtnSolo: { width: 44, paddingHorizontal: 0, justifyContent: 'center' },
  copiarText: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.ink },
  cabeceraLinea: { position: 'absolute', bottom: 0, height: 1, backgroundColor: colors.borderCard },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48, marginBottom: 8 },
  editarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.badgeSand,
  },
  editarText: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.ink },
  espacioVacio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(42, 36, 33, 0.18)',
  },
  espacioVacioText: { fontSize: 16, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.accentStrong },
  fichaWrap: { position: 'relative', marginBottom: 24 },
  hojaDetras: {
    position: 'absolute',
    top: 4,
    bottom: -4,
    left: '2%',
    right: '2%',
    borderRadius: 16,
    backgroundColor: '#F3EAE0',
    borderWidth: 1,
    borderColor: 'rgba(42, 36, 33, 0.1)',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    zIndex: 1,
    padding: 16,
    ...cardBase,
    borderRadius: 16,
    borderColor: colors.borderCard,
    borderTopWidth: 4,
    borderTopColor: colors.accentStrong,
    // Sombra de papel (en web, de dos capas vía theme/paper.js): corta y nítida abajo.
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 0,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: poppinsWeight('700'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  bloodCol: { flex: 1 },
  allergyCol: { flex: 2 },
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
    // Acción, no un contacto más: borde punteado sobre el fondo crema y texto terracota.
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(42, 36, 33, 0.18)',
    backgroundColor: 'transparent',
  },
  secondaryBtnText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.accentStrong },
  contactActionActive: { backgroundColor: colors.badgeSand },
  contactActionDanger: { backgroundColor: '#FDE8E3' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
    // Dato crítico en una emergencia: tinte terracota suave (como el del tipo de sangre) con texto oscuro.
    backgroundColor: '#FBE3DA',
    borderWidth: 1,
    borderColor: '#EBC3B3',
  },
  chipText: {
    fontSize: 16,
    fontFamily: poppinsWeight('600'),
    color: '#6E1F10',
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
    marginBottom: 12,
    gap: 8,
    ...cardBase,
    // Cartulina: sombra corta y nítida abajo (en web, más micro-elevación al pasar el mouse).
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 0,
    elevation: 2,
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
  // Botón redondo sólido en terracota suave: llamar tiene que verse como la acción, sobre todo con apuro.
  contactPhoneIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lime,
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
    color: colors.ink,
    marginTop: 4,
  },
  contactMeta: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 0,
  },
  // Área táctil de 44 px con fondo suave siempre visible (se oscurece al pasar el mouse; el tacho se pone rojo).
  contactActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F7F2EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactFormCard: {
    padding: 16,
    marginBottom: 8,
    ...cardBase,
  },
});
