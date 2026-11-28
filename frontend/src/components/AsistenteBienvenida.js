import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import FormField from './FormField';
import PrimaryButton from './PrimaryButton';
import PressScale from './PressScale';
import OptionPicker from './OptionPicker';
import DatePickerField, { formatDateOnly } from './DatePickerField';
import Ilustracion from './Ilustracion';
import ErrorBanner from './ErrorBanner';
import { mostrarToast } from './ToastHost';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD, MANUSCRITA } from '../theme/typography';
import { rangoNacimiento, validarNacimiento } from '../utils/dateRules';

// Asistente de bienvenida (después de crear la cuenta). Sigue los pasos que promete la landing:
//   1 · ¿Cómo se llama tu familia?   (lo único obligatorio)
//   2 · ¿A quién cuidás?             (Yo · Mi mamá o mi papá · Un hijo o hija · Una mascota; mini formulario por cada uno)
//   3 · Ficha mínima de la primera persona (sangre, alergias, un contacto) — «Lo completo después» bien visible
//   4 · Invitar a alguien            (copiar el código o mandarlo por WhatsApp)
//   → Celebración: «Listo, la Familia X ya está en DOMUS+».
// El grupo se crea en el paso 1 pero se activa recién al final (crearGrupo con `diferir`), para que la app no salte
// a Familia en el medio.
const TOTAL = 4;
const SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ALERGIAS = ['Penicilina', 'AINEs', 'Maní', 'Frutos secos', 'Mariscos', 'Lácteos', 'Huevo', 'Gluten', 'Látex'];
const ESPECIES = ['Perro', 'Gato'];

const OPCIONES = [
  { clave: 'yo', titulo: 'Yo', detalle: 'Mi propia ficha', ilustracion: 'ficha', clase: 'integrante' },
  { clave: 'padre', titulo: 'Mi mamá o mi papá', detalle: 'Aunque no usen la app', ilustracion: 'distancia', clase: 'integrante' },
  { clave: 'hijo', titulo: 'Un hijo o hija', detalle: 'Vacunas y pediatra', ilustracion: 'vacuna', clase: 'integrante' },
  { clave: 'mascota', titulo: 'Una mascota', detalle: 'Vacunas y veterinaria', ilustracion: 'mascota', clase: 'mascota' },
];
const ORDEN_FICHA = ['padre', 'hijo', 'yo'];

// Barra de progreso: tiras de papel que se van pegando.
function Progreso({ paso }) {
  return (
    <View style={styles.progreso} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: TOTAL, now: paso }} accessibilityLabel={`Paso ${paso} de ${TOTAL}`}>
      <View style={styles.tiras}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <View
            key={i}
            style={[
              styles.tira,
              i < paso ? styles.tiraPegada : styles.tiraVacia,
              i < paso && { transform: [{ rotate: `${[-1.5, 1, -0.5, 1.5][i]}deg` }] },
            ]}
          />
        ))}
      </View>
      <Text style={styles.progresoTexto}>Paso {paso} de {TOTAL}</Text>
    </View>
  );
}

function Pie({ principal, onPrincipal, cargando, textoCargando, secundario, onSecundario }) {
  return (
    <View style={styles.pie}>
      <PrimaryButton title={principal} variant="accent" onPress={onPrincipal} loading={cargando} textoCargando={textoCargando} />
      {!!secundario && (
        <PressScale contentStyle={styles.secundario} onPress={onSecundario} disabled={cargando} accessibilityLabel={secundario}>
          <Text style={styles.secundarioTexto}>{secundario}</Text>
        </PressScale>
      )}
    </View>
  );
}

export default function AsistenteBienvenida({ onUnirme, onCerrarSesion }) {
  const { usuario, crearGrupo, entrarAlGrupo } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ancho = width >= 720;

  const [paso, setPaso] = useState(1);
  const [grupo, setGrupo] = useState(null);
  const [nombreFamilia, setNombreFamilia] = useState(usuario?.apellido ? `Familia ${usuario.apellido}` : '');
  const [errorNombre, setErrorNombre] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const [elegidos, setElegidos] = useState([]);
  const [datos, setDatos] = useState({
    yo: { nombre: usuario?.nombre || '', apellido: usuario?.apellido || '', fecha: null },
    padre: { nombre: '', apellido: usuario?.apellido || '', fecha: null },
    hijo: { nombre: '', apellido: usuario?.apellido || '', fecha: null },
    mascota: { nombre: '', especie: '' },
  });
  const [errores, setErrores] = useState({});
  const [creados, setCreados] = useState([]); // [{ clave, clase, id, nombre }]

  const [sangre, setSangre] = useState('');
  const [alergias, setAlergias] = useState([]);
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTel, setContactoTel] = useState('');

  const [codigo, setCodigo] = useState('');

  const cambiar = (clave, campo, valor) => setDatos((d) => ({ ...d, [clave]: { ...d[clave], [campo]: valor } }));
  const alternar = (clave) => setElegidos((e) => (e.includes(clave) ? e.filter((x) => x !== clave) : [...e, clave]));
  const primeraPersona = ORDEN_FICHA.map((c) => creados.find((x) => x.clave === c)).find(Boolean);
  const mascota = creados.find((x) => x.clase === 'mascota');

  // ---- paso 1
  async function crearFamilia() {
    if (!nombreFamilia.trim()) {
      setErrorNombre('Escribí un nombre para tu familia.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const g = await crearGrupo(nombreFamilia.trim(), { diferir: true });
      setGrupo(g);
      setPaso(2);
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setCargando(false);
    }
  }

  // ---- paso 2
  async function guardarQuienes() {
    const errs = {};
    elegidos.forEach((clave) => {
      const d = datos[clave];
      if (clave === 'mascota') {
        if (!d.nombre.trim()) errs[clave] = 'Escribí el nombre.';
        else if (!d.especie) errs[clave] = 'Elegí qué animal es.';
      } else if (!d.nombre.trim() || !d.apellido.trim()) errs[clave] = 'Escribí nombre y apellido.';
      else if (!d.fecha) errs[clave] = 'Elegí la fecha de nacimiento.';
      else if (validarNacimiento(d.fecha)) errs[clave] = validarNacimiento(d.fecha);
    });
    setErrores(errs);
    if (Object.keys(errs).length) return;
    setCargando(true);
    setError('');
    const nuevos = [];
    try {
      for (const clave of elegidos) {
        if (creados.some((c) => c.clave === clave)) continue;
        const d = datos[clave];
        if (clave === 'mascota') {
          const m = await api.post('/api/familia/mascotas', { nombre: d.nombre.trim(), especie: d.especie });
          nuevos.push({ clave, clase: 'mascota', id: m.id, nombre: d.nombre.trim() });
        } else {
          const i = await api.post('/api/familia/integrantes', {
            nombre: d.nombre.trim(),
            apellido: d.apellido.trim(),
            fecha_nacimiento: formatDateOnly(d.fecha),
          });
          nuevos.push({ clave, clase: 'integrante', id: i.id, nombre: d.nombre.trim() });
        }
      }
      const todos = [...creados, ...nuevos];
      setCreados(todos);
      const hayPersona = todos.some((c) => c.clase === 'integrante');
      setPaso(hayPersona ? 3 : 4);
    } catch (err) {
      setCreados((c) => [...c, ...nuevos]);
      setError(err.mensaje);
    } finally {
      setCargando(false);
    }
  }

  // ---- paso 3
  async function guardarFicha() {
    if (!primeraPersona) return setPaso(4);
    setCargando(true);
    setError('');
    try {
      if (sangre || alergias.length) {
        await api.patch(`/api/familia/integrantes/${primeraPersona.id}/emergencia`, {
          tipo_sangre: sangre || null,
          alergias: alergias.length ? alergias.join(', ') : null,
        });
      }
      if (contactoNombre.trim() && contactoTel.trim()) {
        await api.post(`/api/familia/integrantes/${primeraPersona.id}/contactos-emergencia`, {
          nombre: contactoNombre.trim(),
          telefono: contactoTel.trim(),
        });
      }
      setPaso(4);
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setCargando(false);
    }
  }

  // ---- paso 4: el código se genera al llegar
  useEffect(() => {
    if (paso !== 4 || codigo) return;
    api.post('/api/familia/grupo/invitacion').then((d) => setCodigo(d.codigo_invitacion)).catch(() => {});
  }, [paso, codigo]);

  const mensajeInvitacion = `Te invito a la ${grupo?.nombre || nombreFamilia} en DOMUS+. Creá tu cuenta y sumate con este código: ${codigo}`;

  async function copiar() {
    await Clipboard.setStringAsync(codigo);
    mostrarToast('Código copiado');
  }

  async function entrar() {
    setCargando(true);
    try {
      await entrarAlGrupo(grupo);
    } catch (err) {
      setError(err.mensaje);
      setCargando(false);
    }
  }

  // ---------------- pasos ----------------
  let contenido;
  if (paso === 1) {
    contenido = (
      <>
        <Ilustracion nombre="familia" size={120} style={styles.ilustracion} />
        <Text style={styles.titulo} accessibilityRole="header">¿Cómo se llama tu familia?</Text>
        <Text style={styles.sub}>Así la van a ver las personas que invites. Lo podés cambiar después.</Text>
        <FormField
          label="Nombre de la familia"
          value={nombreFamilia}
          onChangeText={(t) => { setNombreFamilia(t); setErrorNombre(''); }}
          placeholder="Familia Pérez"
          error={errorNombre}
          returnKeyType="go"
          onSubmitEditing={crearFamilia}
        />
        <ErrorBanner message={error} />
        <Pie principal="Seguir" onPrincipal={crearFamilia} cargando={cargando} textoCargando="Creando tu familia…" />
        <PressScale contentStyle={styles.enlaceFila} onPress={onUnirme} accessibilityLabel="Me invitaron: tengo un código">
          <Text style={styles.enlaceTexto}>¿Te invitaron a una familia? <Text style={styles.enlace}>Ingresá el código</Text></Text>
        </PressScale>
      </>
    );
  } else if (paso === 2) {
    contenido = (
      <>
        <Text style={styles.titulo} accessibilityRole="header">¿A quién cuidás?</Text>
        <Text style={styles.sub}>Elegí todos los que quieras. Después podés sumar más.</Text>
        <View style={[styles.opciones, ancho && styles.opcionesAncho]}>
          {OPCIONES.map((o) => {
            const on = elegidos.includes(o.clave);
            const d = datos[o.clave];
            return (
              <View key={o.clave} style={[styles.opcionCaja, ancho && styles.opcionCajaAncha]}>
                <PressScale
                  contentStyle={[styles.opcion, on && styles.opcionOn]}
                  onPress={() => alternar(o.clave)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${o.titulo}. ${o.detalle}`}
                >
                  <Ilustracion nombre={o.ilustracion} size={72} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.opcionTitulo}>{o.titulo}</Text>
                    <Text style={styles.opcionDetalle}>{o.detalle}</Text>
                  </View>
                  <View style={[styles.check, on && styles.checkOn]}>{on && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}</View>
                </PressScale>
                {on && (
                  <View style={styles.mini}>
                    {o.clase === 'mascota' ? (
                      <>
                        <FormField label="¿Cómo se llama?" value={d.nombre} onChangeText={(t) => cambiar(o.clave, 'nombre', t)} placeholder="Bruno" />
                        <OptionPicker label="¿Qué es?" options={ESPECIES} value={d.especie} onChange={(v) => cambiar(o.clave, 'especie', v)} otherLabel="Otro" otherFieldLabel="¿Qué animal es?" otherPlaceholder="Conejo" />
                      </>
                    ) : (
                      <>
                        <View style={styles.dosCampos}>
                          <FormField style={{ flex: 1 }} label="Nombre" value={d.nombre} onChangeText={(t) => cambiar(o.clave, 'nombre', t)} />
                          <FormField style={{ flex: 1 }} label="Apellido" value={d.apellido} onChangeText={(t) => cambiar(o.clave, 'apellido', t)} />
                        </View>
                        <DatePickerField
                          label="Fecha de nacimiento"
                          value={d.fecha}
                          onChange={(f) => cambiar(o.clave, 'fecha', f)}
                          mode="date"
                          minimumDate={rangoNacimiento().min}
                          maximumDate={rangoNacimiento().max}
                        />
                      </>
                    )}
                    {!!errores[o.clave] && <Text style={styles.errorCampo} accessibilityRole="alert">{errores[o.clave]}</Text>}
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <ErrorBanner message={error} />
        <Pie
          principal={elegidos.length ? 'Seguir' : 'Seguir sin cargar a nadie'}
          onPrincipal={guardarQuienes}
          cargando={cargando}
          textoCargando="Guardando…"
          secundario={elegidos.length ? 'Lo hago después' : null}
          onSecundario={() => setPaso(creados.some((c) => c.clase === 'integrante') ? 3 : 4)}
        />
      </>
    );
  } else if (paso === 3) {
    const n = primeraPersona?.nombre || '';
    contenido = (
      <>
        <Ilustracion nombre="ficha" size={110} style={styles.ilustracion} />
        <Text style={styles.titulo} accessibilityRole="header">¿Qué tiene que saber un médico de {n}?</Text>
        <Text style={styles.sub}>Lo mínimo para una emergencia. Todo es opcional y lo podés completar después.</Text>
        <OptionPicker label="Tipo de sangre" options={SANGRE} value={sangre} onChange={setSangre} style={styles.campo} />
        <OptionPicker label="Alergias" options={ALERGIAS} value={alergias} onChange={setAlergias} multiple otherLabel="Otras" otherFieldLabel="¿Cuáles otras?" otherPlaceholder="Ibuprofeno, kiwi" style={styles.campo} />
        <Text style={styles.subtitulo}>A quién llamar si a {n} le pasa algo</Text>
        <View style={styles.dosCampos}>
          <FormField style={{ flex: 1 }} label="Nombre" value={contactoNombre} onChangeText={setContactoNombre} placeholder="Mónica" />
          <FormField style={{ flex: 1 }} label="Teléfono" value={contactoTel} onChangeText={setContactoTel} placeholder="11 5555 1201" keyboardType="phone-pad" />
        </View>
        <ErrorBanner message={error} />
        <Pie
          principal="Guardar la ficha"
          onPrincipal={guardarFicha}
          cargando={cargando}
          textoCargando="Guardando…"
          secundario="Lo completo después"
          onSecundario={() => setPaso(4)}
        />
      </>
    );
  } else if (paso === 4) {
    contenido = (
      <>
        <Ilustracion nombre="campana" size={110} style={styles.ilustracion} />
        <Text style={styles.titulo} accessibilityRole="header">¿Sumás a alguien más?</Text>
        <Text style={styles.sub}>Con este código, otra persona crea su cuenta y ve lo mismo que vos. También lo encontrás después en Cuenta.</Text>
        <View style={styles.codigoCaja} accessibilityLabel={codigo ? `Código de invitación: ${codigo.split('').join(' ')}` : 'Generando el código'}>
          <Text style={styles.codigo}>{codigo || '…'}</Text>
        </View>
        <View style={styles.dosCampos}>
          <PressScale contentStyle={styles.botonCodigo} onPress={copiar} disabled={!codigo} accessibilityLabel="Copiar el código">
            <Ionicons name="copy-outline" size={20} color={colors.ink} />
            <Text style={styles.botonCodigoTexto}>Copiar</Text>
          </PressScale>
          <PressScale
            contentStyle={[styles.botonCodigo, styles.botonWhats]}
            onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(mensajeInvitacion)}`)}
            disabled={!codigo}
            accessibilityLabel="Mandar la invitación por WhatsApp"
          >
            <Ionicons name="logo-whatsapp" size={20} color="#2F6B3A" />
            <Text style={[styles.botonCodigoTexto, { color: '#2F6B3A' }]}>WhatsApp</Text>
          </PressScale>
        </View>
        <Pie principal="Seguir" onPrincipal={() => setPaso(5)} secundario="Ahora no" onSecundario={() => setPaso(5)} />
      </>
    );
  } else {
    // ---- celebración
    contenido = (
      <View style={styles.listo}>
        <View style={styles.escena}>
          <Ilustracion nombre="familia" size={180} />
          <View style={styles.figuras}>
            {creados.map((c, i) => (
              <View key={c.id} style={[styles.figura, { transform: [{ rotate: `${[-4, 3, -2, 4][i % 4]}deg` }] }]}>
                <Ionicons name={c.clase === 'mascota' ? 'paw' : 'person'} size={16} color={c.clase === 'mascota' ? '#4A6B5D' : colors.accentStrong} />
                <Text style={styles.figuraTexto}>{c.nombre}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={[styles.titulo, { textAlign: 'center' }]} accessibilityRole="header">
          Listo, la {grupo?.nombre || nombreFamilia} ya está en DOMUS+
        </Text>
        <Text style={[styles.sub, { textAlign: 'center' }]}>
          {mascota ? `¿${mascota.nombre} ya tiene sus vacunas? ` : ''}Te dejamos una lista de primeros pasos en Familia.
        </Text>
        <ErrorBanner message={error} />
        <View style={{ width: '100%', maxWidth: 360 }}>
          <PrimaryButton title="Entrar" variant="accent" onPress={entrar} loading={cargando} textoCargando="Entrando…" />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.raiz} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
      <View style={[styles.columna, paso === 2 && ancho && { maxWidth: 760 }]}>
        <View style={styles.arriba}>
          {paso <= TOTAL ? <Progreso paso={paso} /> : <View />}
          {paso === 1 && (
            <PressScale contentStyle={styles.salir} onPress={onCerrarSesion} accessibilityLabel="Cerrar sesión">
              <Text style={styles.salirTexto}>Cerrar sesión</Text>
            </PressScale>
          )}
        </View>
        {contenido}
      </View>
    </ScrollView>
  );
}

const SOMBRA = Platform.select({
  web: { boxShadow: '3px 4px 0 rgba(42,36,33,0.12)' },
  default: { shadowColor: '#2A2421', shadowOffset: { width: 3, height: 4 }, shadowOpacity: 0.12, shadowRadius: 0, elevation: 2 },
});

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: '#FBF6EE' },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  columna: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 4 },
  arriba: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  progreso: { gap: 8, flex: 1, maxWidth: 320 },
  tiras: { flexDirection: 'row', gap: 6 },
  tira: { flex: 1, height: 12, borderRadius: 2 },
  tiraPegada: { backgroundColor: '#C24623', ...SOMBRA },
  tiraVacia: { backgroundColor: '#EFE6DA' },
  progresoTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: '#574E49' },
  salir: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  salirTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.textBody, textDecorationLine: 'underline' },
  ilustracion: { alignSelf: 'flex-start', marginBottom: 8 },
  titulo: { fontSize: 34, lineHeight: 42, fontFamily: SERIF_BOLD, color: colors.ink },
  sub: { fontSize: 18, lineHeight: 27, color: colors.textBody, marginTop: 8, marginBottom: 24 },
  subtitulo: { fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink, marginTop: 4, marginBottom: 8 },
  campo: { paddingBottom: 20 },
  pie: { gap: 8, marginTop: 16 },
  secundario: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(42,36,33,0.2)', backgroundColor: '#FFFDF9' },
  secundarioTexto: { fontSize: 17, fontFamily: poppinsWeight('600'), color: colors.ink },
  enlaceFila: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  enlaceTexto: { fontSize: 17, lineHeight: 25, color: colors.textBody, textAlign: 'center' },
  enlace: { fontFamily: poppinsWeight('600'), color: colors.accentStrong, textDecorationLine: 'underline' },
  // paso 2
  opciones: { gap: 14 },
  opcionesAncho: { flexDirection: 'row', flexWrap: 'wrap' },
  opcionCaja: { width: '100%' },
  opcionCajaAncha: { width: '48.5%' },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 96, padding: 14, borderRadius: 16, backgroundColor: '#FFFDF9', borderWidth: 2, borderColor: 'transparent', ...SOMBRA },
  opcionOn: { borderColor: '#C24623', backgroundColor: '#FDF3EE' },
  opcionTitulo: { fontSize: 18, lineHeight: 24, fontFamily: poppinsWeight('700'), color: colors.ink },
  opcionDetalle: { fontSize: 15, lineHeight: 21, color: colors.textBody },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(42,36,33,0.25)', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#C24623', borderColor: '#C24623' },
  mini: { marginTop: 10, padding: 14, paddingBottom: 0, borderRadius: 14, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: 'rgba(42,36,33,0.1)' },
  dosCampos: { flexDirection: 'row', gap: 12 },
  errorCampo: { fontSize: 15, lineHeight: 22, color: '#A6291B', fontFamily: poppinsWeight('600'), marginBottom: 12 },
  // paso 4
  codigoCaja: { alignSelf: 'flex-start', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FFFDF9', borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(194,70,35,0.45)', marginBottom: 16 },
  codigo: { fontSize: 36, lineHeight: 44, letterSpacing: 6, fontFamily: poppinsWeight('700'), color: colors.ink, fontVariant: ['tabular-nums'] },
  botonCodigo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(42,36,33,0.2)', backgroundColor: '#FFFDF9' },
  botonWhats: { borderColor: '#2F6B3A' },
  botonCodigoTexto: { fontSize: 17, fontFamily: poppinsWeight('600'), color: colors.ink },
  // celebración
  listo: { alignItems: 'center', gap: 8 },
  escena: { alignItems: 'center', padding: 24, borderRadius: 28, backgroundColor: '#F6E1D8', width: '100%', marginBottom: 16, ...SOMBRA },
  figuras: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 },
  figura: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FFFDF9', ...SOMBRA },
  figuraTexto: { fontFamily: MANUSCRITA, fontSize: 22, color: '#3B3022' },
});
