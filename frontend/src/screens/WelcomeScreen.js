import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Platform, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD, MANUSCRITA } from '../theme/typography';
import { LogoConNombre } from '../components/Logo';
import PrimaryButton from '../components/PrimaryButton';
import PressScale from '../components/PressScale';
import FadeSlideIn from '../components/FadeSlideIn';
import Ilustracion from '../components/Ilustracion';
import EscenaHogar from '../components/EscenaHogar';
import { Subrayado } from '../components/FamilyDoodles';
import { paper } from '../theme/paper';
import { useAuth } from '../context/AuthContext';
import { LEGAL } from '../utils/legal';
import { DEMO } from '../config/env';

// Landing de DOMUS+ (ronda de la landing). Reglas:
//  - la página demuestra lo que promete: letra grande (cuerpo 18 px, títulos de sección 36–40 px);
//  - contenido de 1200 px y aire vertical de ~120 px por sección (en escritorio);
//  - escenas de papel recortado en lugar de íconos de línea; post-its sólo para explicar (no para datos);
//  - nada inventado: sin testimonios ni QR (no existe en la app; decisión D1 de la Fase 3).
const DESKTOP_BREAKPOINT = 900;
const CONTENIDO = 1200;
const TINTA = '#2A2421';
const CUERPO = '#3F3631';
const BANDA = '#F3EAE0';

// Sombra de papel: corrida y sin difuminar.
const SOMBRA_PAPEL = Platform.select({
  web: { boxShadow: '3px 4px 0 rgba(42,36,33,0.12)' },
  default: { shadowColor: TINTA, shadowOffset: { width: 3, height: 4 }, shadowOpacity: 0.12, shadowRadius: 0, elevation: 3 },
});

const PASOS = [
  { n: '1', ilustracion: 'familia', titulo: 'Creás tu familia', texto: 'Tu cuenta y un nombre para la familia. Listo en un minuto.' },
  { n: '2', ilustracion: 'familiaperro', titulo: 'Sumás a quienes cuidás', texto: 'Personas y mascotas, aunque no usen la app: sus vacunas, remedios y contactos.' },
  { n: '3', ilustracion: 'campana', titulo: 'Todos ven lo mismo', texto: 'Lo que carga uno lo ve toda la familia. Los avisos llegan a cada celular con la app.' },
];

const CASOS = [
  {
    ilustracion: 'distancia',
    titulo: 'Cuidar a tus padres a la distancia',
    texto: 'Mirá si ya tomaron la medicación o cuándo tienen turno, sin llamar a cada rato. Si algo pasa, su ficha está a dos toques.',
  },
  { ilustracion: 'vacuna', titulo: 'Hijos chicos', texto: 'Vacunas del calendario y turnos con el pediatra, sin perder la libreta.' },
  { ilustracion: 'mascota', titulo: 'Mascotas', texto: 'Vacunas, antiparasitarios y el teléfono de la veterinaria, para todos los de la casa.' },
];

const SELLOS = [
  { icono: 'lock-closed', titulo: 'Sólo lo ve tu familia', texto: 'Los datos de salud los ven las personas que invitás. Nadie más.' },
  { icono: 'ban', titulo: 'Sin publicidad', texto: 'No mostramos anuncios ni vendemos ni compartimos tu información.' },
  { icono: 'text', titulo: 'Letra grande, si la necesitás', texto: 'Se agranda desde Cuenta, en el mismo celular, para quien lo necesite.' },
];

const PREGUNTAS = [
  { p: '¿Es gratis?', r: 'Sí. Crear la familia, cargar personas y mascotas e invitar a otros no cuesta nada.' },
  {
    p: '¿Quién ve mis datos?',
    r: 'Sólo las personas que invitás a tu familia. El equipo que administra DOMUS+ ve estadísticas generales, nunca datos médicos.',
  },
  {
    p: '¿Mis padres necesitan celular o saber usar la app?',
    r: 'No. Podés cargarlos como «persona sin cuenta» y llevar vos sus vacunas, remedios y turnos. Si quieren, después los invitás.',
  },
  {
    p: '¿Funciona sin internet?',
    r: 'Las fichas de emergencia se pueden abrir sin conexión en el celular donde ya entraste. Para cargar o marcar algo hace falta internet.',
  },
  { p: '¿Puedo borrar todo?', r: 'Sí. Desde Cuenta podés descargar tus datos y eliminar tu cuenta. Si sos la única persona de la familia, se borra todo.' },
];

// Contacto: proyecto académico. TODO(equipo): reemplazar por el correo de contacto real antes de publicar.
const CONTACTO = {
  titulo: 'Contacto',
  parrafos: [
    'DOMUS+ es un proyecto de Prácticas Profesionalizantes II del IES Santa Fe.',
    'Si encontraste un error o tenés una sugerencia, escribinos desde la app: Cuenta → Ayuda.',
  ],
};

function Seccion({ fondo, children, style, escritorio }) {
  return (
    <View style={[{ width: '100%' }, fondo && { backgroundColor: fondo }, { paddingVertical: escritorio ? 120 : 64 }, style]}>
      <View style={[styles.contenido, { paddingHorizontal: escritorio ? 40 : 24 }]}>{children}</View>
    </View>
  );
}

function Titulo({ children, sub, escritorio, centrado }) {
  return (
    <View style={[styles.titulo, centrado && { alignItems: 'center' }]}>
      <Text style={[styles.h2, escritorio && styles.h2Grande, centrado && { textAlign: 'center' }]} accessibilityRole="header">
        {children}
      </Text>
      {!!sub && <Text style={[styles.cuerpo, centrado && { textAlign: 'center' }]}>{sub}</Text>}
    </View>
  );
}

// Etiqueta de papel con el número del paso (chiquita, sobre la escena).
function EtiquetaPaso({ n }) {
  return (
    <View style={styles.etiquetaPaso}>
      <Text style={styles.etiquetaPasoTexto}>Paso {n}</Text>
    </View>
  );
}

// Caminito recortado que une las escenas (una tira de papel ondulada, no una línea punteada).
function Caminito() {
  return (
    <View pointerEvents="none" style={styles.caminito} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={60} viewBox="0 0 1000 60" preserveAspectRatio="none">
        <Path d="M0 38 C160 8 300 58 500 30 C700 2 840 52 1000 26 L1000 40 C840 66 700 16 500 44 C300 72 160 22 0 52 Z" fill="#E4D6C6" transform="translate(3 4)" />
        <Path d="M0 38 C160 8 300 58 500 30 C700 2 840 52 1000 26 L1000 40 C840 66 700 16 500 44 C300 72 160 22 0 52 Z" fill="#E9D3BC" />
      </Svg>
    </View>
  );
}

// Flechita dibujada a mano (para los post-its de la ficha).
function Flechita({ direccion = 'derecha', style }) {
  const d = direccion === 'derecha' ? 'M4 30 C24 6 52 4 70 18 M60 8 L71 18 L58 24' : 'M70 30 C50 6 22 4 4 18 M14 8 L3 18 L16 24';
  return (
    <View pointerEvents="none" style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={76} height={36}>
        <Path d={d} fill="none" stroke="#8A5A0E" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function PostItNota({ children, giro, tono = '#FBE7A8', style }) {
  return (
    <View style={[styles.postit, { backgroundColor: tono, transform: [{ rotate: `${giro}deg` }] }, style]}>
      <View pointerEvents="none" style={styles.postitCinta} />
      <Text style={styles.postitTexto}>{children}</Text>
    </View>
  );
}

// La ficha de emergencia en grande: tarjeta de papel con dos hojas detrás y sombra de hoja.
function FichaGrande({ escritorio }) {
  return (
    <View style={styles.fichaEscena}>
      <View pointerEvents="none" style={[styles.fichaHoja, { backgroundColor: '#E9C6B5', transform: [{ rotate: '-4deg' }] }]} />
      <View pointerEvents="none" style={[styles.fichaHoja, { backgroundColor: '#DCE7E0', transform: [{ rotate: '3deg' }] }]} />
      <View style={[styles.ficha, SOMBRA_PAPEL]} accessible accessibilityLabel="Ejemplo de ficha de emergencia: María Elena Argento, 79 años. Tipo de sangre A más. Alergias: penicilina y AINEs. Toma Losartán 50 miligramos. Llamar a Mónica, hija.">
        <View style={styles.fichaCab}>
          <Text style={[styles.fichaNombre, escritorio && { fontSize: 30, lineHeight: 38 }]}>María Elena Argento</Text>
          <Text style={styles.fichaSub}>79 años · Ficha de emergencia</Text>
        </View>
        <View style={styles.fichaCuerpo}>
          <View style={styles.fichaFila}>
            <View style={styles.fichaSangre}>
              <Text style={styles.fichaEtiqueta}>Tipo de sangre</Text>
              <Text style={styles.fichaSangreValor}>A+</Text>
            </View>
            <View style={{ flex: 1.4, gap: 8 }}>
              <Text style={styles.fichaEtiqueta}>Alergias</Text>
              <View style={styles.fichaChips}>
                {['Penicilina', 'AINEs'].map((a) => (
                  <View key={a} style={styles.fichaChip}><Text style={styles.fichaChipTexto}>{a}</Text></View>
                ))}
              </View>
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={styles.fichaEtiqueta}>Toma actualmente</Text>
            <Text style={styles.cuerpo}>Losartán 50 mg · todos los días</Text>
          </View>
          <View style={styles.fichaContacto}>
            <View style={styles.fichaTel}><Ionicons name="call" size={20} color="#FFFFFF" /></View>
            <View>
              <Text style={styles.fichaContactoNombre}>Mónica · Hija</Text>
              <Text style={styles.fichaContactoTel}>11 5555 1201</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function ModalTexto({ contenido, onCerrar }) {
  return (
    <Modal visible={!!contenido} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.modalFondo}>
        <View style={[styles.modalCard, SOMBRA_PAPEL]} accessibilityViewIsModal>
          <Text style={styles.modalTitulo} accessibilityRole="header">{contenido?.titulo}</Text>
          {contenido?.parrafos.map((p) => (
            <Text key={p} style={styles.cuerpo}>{p}</Text>
          ))}
          <View style={{ marginTop: 8 }}>
            <PrimaryButton title="Entendido" variant="accent" onPress={onCerrar} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const escritorio = width >= DESKTOP_BREAKPOINT;
  const { login } = useAuth();
  const [modal, setModal] = useState(null);
  const [abierta, setAbierta] = useState(0);
  const [entrandoDemo, setEntrandoDemo] = useState(false);

  const irLogin = () => navigation.navigate('Login');
  const irRegistro = () => navigation.navigate('Register');
  // «Ver una familia de ejemplo»: sólo si hay una cuenta demo configurada (app.json → extra.demo).
  async function verDemo() {
    setEntrandoDemo(true);
    try {
      await login(DEMO.email, DEMO.password, false);
    } catch {
      setEntrandoDemo(false);
    }
  }

  const ctas = (grande) => (
    <View style={[styles.ctas, !escritorio && { alignItems: 'stretch' }]}>
      <PressScale contentStyle={[styles.ctaPrincipal, grande && styles.ctaPrincipalGrande]} onPress={irRegistro} accessibilityLabel="Crear cuenta gratis">
        <Text style={[styles.ctaPrincipalTexto, grande && { fontSize: 20 }]}>Crear cuenta gratis</Text>
      </PressScale>
      {!!DEMO && (
        <PressScale contentStyle={styles.ctaSecundario} onPress={verDemo} disabled={entrandoDemo} accessibilityLabel="Ver una familia de ejemplo">
          <Text style={styles.ctaSecundarioTexto}>{entrandoDemo ? 'Abriendo…' : 'Ver una familia de ejemplo'}</Text>
        </PressScale>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top }} showsVerticalScrollIndicator={false}>
        {/* ---------- Encabezado + hero ---------- */}
        <Seccion escritorio={escritorio} style={{ paddingTop: 16, paddingBottom: escritorio ? 120 : 56 }}>
          <View style={styles.header}>
            <LogoConNombre variante="terracota" size={40} />
            <View style={styles.headerDerecha}>
              <PressScale contentStyle={styles.headerLink} onPress={irLogin} accessibilityLabel="Iniciar sesión">
                <Text style={styles.headerLinkTexto}>Iniciar sesión</Text>
              </PressScale>
              {escritorio && (
                <PressScale contentStyle={styles.headerPill} onPress={irRegistro} accessibilityLabel="Tengo un código de invitación">
                  <Text style={styles.headerPillTexto}>Tengo un código de invitación</Text>
                </PressScale>
              )}
            </View>
          </View>

          <View style={[styles.hero, escritorio && styles.heroEscritorio]}>
            <View style={[styles.heroTexto, escritorio && { flex: 1.05 }]}>
              <FadeSlideIn index={1}>
                <Text style={[styles.h1, escritorio && styles.h1Grande]} accessibilityRole="header">
                  La salud de tu familia y tus mascotas,{' '}
                  <Text style={styles.h1Acento}>en un solo lugar.</Text>
                </Text>
              </FadeSlideIn>
              <FadeSlideIn index={2}>
                <Text style={[styles.cuerpo, styles.bajada]}>
                  Vacunas, remedios, turnos y la ficha de emergencia de cada uno, compartidos con quienes cuidan con vos.
                </Text>
              </FadeSlideIn>
              <FadeSlideIn index={3}>{ctas(true)}</FadeSlideIn>
              <PressScale contentStyle={styles.invitacion} onPress={irRegistro} accessibilityLabel="Me invitaron a una familia: crear cuenta para unirme con un código">
                <Text style={styles.cuerpo}>
                  ¿Te invitaron? <Text style={styles.enlace}>Sumate con tu código</Text>
                </Text>
              </PressScale>
            </View>
            <View style={[styles.heroFotoCaja, escritorio && { flex: 1 }]}>
              {/* Escena de papel (no foto de stock): casita, familia y perro, con la carta del próximo aviso. */}
              <View style={[styles.heroEscena, { height: escritorio ? 480 : 300 }, SOMBRA_PAPEL]}>
                <EscenaHogar variante="landing" carta={escritorio ? { titulo: 'Familia García · 4 integrantes', texto: 'Próximo aviso: vacuna de Toby' } : undefined} />
              </View>
            </View>
          </View>
        </Seccion>

        {/* ---------- Cómo funciona: tres escenas unidas por un caminito ---------- */}
        <Seccion fondo={BANDA} escritorio={escritorio}>
          <Titulo escritorio={escritorio} sub="Tres pasos, sin formularios largos.">Cómo funciona</Titulo>
          <View style={styles.pasosCaja}>
            {escritorio && <Caminito />}
            <View style={[styles.pasos, escritorio && styles.pasosFila]}>
              {PASOS.map((p) => (
                <View key={p.n} style={[styles.paso, escritorio && { flex: 1 }]}>
                  <View style={styles.pasoEscena}>
                    <Ilustracion nombre={p.ilustracion} size={escritorio ? 160 : 128} />
                    <EtiquetaPaso n={p.n} />
                  </View>
                  <Text style={styles.h3}>{p.titulo}</Text>
                  <Text style={[styles.cuerpo, { textAlign: escritorio ? 'center' : 'left' }]}>{p.texto}</Text>
                </View>
              ))}
            </View>
          </View>
        </Seccion>

        {/* ---------- La ficha de emergencia, grande, con post-its que la explican ---------- */}
        <Seccion escritorio={escritorio}>
          <View style={[styles.fichaSeccion, escritorio && styles.fichaSeccionFila]}>
            <View style={[escritorio && { flex: 0.8 }, { gap: 16 }]}>
              <Titulo escritorio={escritorio} sub="Lo que te preguntan primero en una guardia, a dos toques. También sin conexión.">
                La ficha de emergencia
              </Titulo>
              {!escritorio && (
                <View style={{ gap: 12 }}>
                  <PostItNota giro={-2}>1 · Toda la familia ve la misma ficha</PostItNota>
                  <PostItNota giro={2} tono="#F6D3CB">2 · Sangre y alergias, bien grandes</PostItNota>
                  <PostItNota giro={-1}>3 · Un toque y llama</PostItNota>
                </View>
              )}
            </View>
            <View style={[styles.fichaCaja, escritorio && { flex: 1.2 }]}>
              <FichaGrande escritorio={escritorio} />
              {escritorio && (
                <>
                  <PostItNota giro={-4} style={styles.nota1}>Toda la familia ve la misma ficha</PostItNota>
                  <Flechita direccion="derecha" style={styles.flecha1} />
                  <PostItNota giro={3} tono="#F6D3CB" style={styles.nota2}>Sangre y alergias, bien grandes</PostItNota>
                  <Flechita direccion="izquierda" style={styles.flecha2} />
                  <PostItNota giro={-2} style={styles.nota3}>Un toque y llama</PostItNota>
                  <Flechita direccion="izquierda" style={styles.flecha3} />
                </>
              )}
            </View>
          </View>
        </Seccion>

        {/* ---------- Para qué la usan: un caso protagonista y dos secundarios ---------- */}
        <Seccion fondo={BANDA} escritorio={escritorio}>
          <Titulo escritorio={escritorio}>Para qué la usan las familias</Titulo>
          <View style={[styles.casos, escritorio && styles.casosFila]}>
            <View style={[styles.caso, styles.casoProtagonista, SOMBRA_PAPEL, escritorio && { flex: 1.3 }]}>
              <Ilustracion nombre={CASOS[0].ilustracion} size={escritorio ? 200 : 150} />
              <Text style={[styles.h3, { fontSize: 26, lineHeight: 34 }]}>{CASOS[0].titulo}</Text>
              <Text style={styles.cuerpo}>{CASOS[0].texto}</Text>
            </View>
            <View style={[styles.casosSecundarios, escritorio && { flex: 1 }]}>
              {CASOS.slice(1).map((c) => (
                <View key={c.titulo} style={[styles.caso, styles.casoSecundario, SOMBRA_PAPEL]}>
                  <Ilustracion nombre={c.ilustracion} size={96} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.h3}>{c.titulo}</Text>
                    <Text style={styles.cuerpo}>{c.texto}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          {/* Prueba social honesta: sin testimonios inventados. */}
          <View style={styles.hechoEn}>
            <Ionicons name="heart" size={18} color={colors.accentStrong} />
            <Text style={styles.hechoEnTexto}>Hecho en Santa Fe, para familias como la tuya.</Text>
          </View>
        </Seccion>

        {/* ---------- Confianza: tres sellos de papel ---------- */}
        <Seccion escritorio={escritorio}>
          <View style={[styles.sellos, escritorio && styles.sellosFila]}>
            {SELLOS.map((s, i) => (
              <View key={s.titulo} style={[styles.sello, escritorio && { flex: 1 }]}>
                <View style={[styles.selloDisco, { transform: [{ rotate: `${[-6, 4, -3][i]}deg` }] }, SOMBRA_PAPEL]}>
                  <View style={styles.selloAnillo}>
                    <Ionicons name={s.icono} size={34} color={colors.accentStrong} />
                  </View>
                </View>
                <Text style={[styles.h3, { textAlign: 'center' }]}>{s.titulo}</Text>
                <Text style={[styles.cuerpo, { textAlign: 'center' }]}>{s.texto}</Text>
              </View>
            ))}
          </View>
        </Seccion>

        {/* ---------- Preguntas frecuentes ---------- */}
        <Seccion fondo={BANDA} escritorio={escritorio}>
          <Titulo escritorio={escritorio}>Preguntas frecuentes</Titulo>
          <View style={styles.faq}>
            {PREGUNTAS.map((q, i) => {
              const on = abierta === i;
              return (
                <View key={q.p} style={[styles.faqItem, SOMBRA_PAPEL]}>
                  <PressScale
                    contentStyle={styles.faqPregunta}
                    onPress={() => setAbierta(on ? -1 : i)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: on }}
                    accessibilityLabel={q.p}
                  >
                    <Text style={[styles.h3, { flex: 1 }]}>{q.p}</Text>
                    <Ionicons name={on ? 'remove' : 'add'} size={26} color={colors.accentStrong} />
                  </PressScale>
                  {on && <Text style={[styles.cuerpo, styles.faqRespuesta]}>{q.r}</Text>}
                </View>
              );
            })}
          </View>
        </Seccion>

        {/* ---------- Cierre: escena de papel con el corazón y la pata adentro ---------- */}
        <Seccion escritorio={escritorio}>
          <View style={[styles.cierre, SOMBRA_PAPEL]}>
            <View style={styles.cierreEscena}>
              <Ilustracion nombre="familiaperro" size={escritorio ? 200 : 150} />
            </View>
            <Text style={[styles.h2, escritorio && styles.h2Grande, { textAlign: 'center' }]}>Armá la libreta de tu familia</Text>
            <Text style={[styles.cuerpo, { textAlign: 'center', maxWidth: 560 }]}>
              Gratis, en un minuto, y con lugar para todos: los que viven con vos, los que cuidás de lejos y los de cuatro patas.
            </Text>
            {ctas(true)}
          </View>
        </Seccion>

        {/* ---------- Pie ---------- */}
        <View style={[styles.pie, { paddingBottom: insets.bottom + 32 }]}>
          <View style={[styles.contenido, styles.pieFila, { paddingHorizontal: escritorio ? 40 : 24 }]}>
            <LogoConNombre variante="terracota" size={32} />
            <View style={styles.pieEnlaces}>
              {[['Privacidad', LEGAL.privacidad], ['Términos', LEGAL.terminos], ['Contacto', CONTACTO]].map(([t, c]) => (
                <PressScale key={t} contentStyle={styles.pieEnlace} onPress={() => setModal(c)} accessibilityRole="link" accessibilityLabel={t}>
                  <Text style={styles.pieEnlaceTexto}>{t}</Text>
                </PressScale>
              ))}
            </View>
            <Text style={styles.pieLegal}>© 2026 DOMUS+</Text>
          </View>
        </View>
      </ScrollView>
      <ModalTexto contenido={modal} onCerrar={() => setModal(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  contenido: { width: '100%', maxWidth: CONTENIDO, alignSelf: 'center' },
  cuerpo: { fontSize: 18, lineHeight: 29, color: CUERPO },
  enlace: { fontFamily: poppinsWeight('600'), color: colors.accentStrong, textDecorationLine: 'underline' },
  h1: { fontSize: 38, lineHeight: 46, fontFamily: SERIF_BOLD, color: TINTA },
  h1Grande: { fontSize: 58, lineHeight: 68 },
  h1Acento: { color: colors.accentStrong },
  h2: { fontSize: 32, lineHeight: 40, fontFamily: SERIF_BOLD, color: TINTA },
  h2Grande: { fontSize: 40, lineHeight: 50 },
  h3: { fontSize: 21, lineHeight: 29, fontFamily: poppinsWeight('700'), color: TINTA },
  titulo: { gap: 12, marginBottom: 48, maxWidth: 720 },

  // encabezado + hero
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 72, gap: 12 },
  headerDerecha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLink: { minHeight: 48, paddingHorizontal: 14, justifyContent: 'center' },
  headerLinkTexto: { fontSize: 17, fontFamily: poppinsWeight('600'), color: TINTA },
  headerPill: { minHeight: 48, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(42,36,33,0.18)', backgroundColor: '#FFFDF9' },
  headerPillTexto: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.accentStrong },
  hero: { marginTop: 32, gap: 48 },
  heroEscritorio: { flexDirection: 'row', alignItems: 'center', gap: 72, marginTop: 64 },
  heroTexto: { gap: 24 },
  bajada: { fontSize: 20, lineHeight: 32, maxWidth: 560 },
  ctas: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  ctaPrincipal: { minHeight: 56, paddingHorizontal: 28, borderRadius: 14, backgroundColor: colors.accentStrong, alignItems: 'center', justifyContent: 'center', ...SOMBRA_PAPEL },
  ctaPrincipalGrande: { minHeight: 64, paddingHorizontal: 36 },
  ctaPrincipalTexto: { fontSize: 18, fontFamily: poppinsWeight('700'), color: '#FFFFFF' },
  ctaSecundario: { minHeight: 56, paddingHorizontal: 24, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(42,36,33,0.25)', backgroundColor: '#FFFDF9', alignItems: 'center', justifyContent: 'center' },
  ctaSecundarioTexto: { fontSize: 18, fontFamily: poppinsWeight('600'), color: TINTA },
  invitacion: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  heroFotoCaja: { position: 'relative', alignItems: 'center', paddingBottom: 24, width: '100%' },
  heroEscena: { width: '100%', maxWidth: 600, borderRadius: 24, overflow: 'hidden', borderWidth: 6, borderColor: '#FFFFFF', transform: [{ rotate: '1deg' }] },
  heroFoto: { width: '100%', maxWidth: 580, borderRadius: 20, overflow: 'hidden', borderWidth: 8, borderColor: '#FFFFFF', transform: [{ rotate: '1.5deg' }] },
  heroImagen: { width: '100%', aspectRatio: 600 / 380 },
  heroTarjeta: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFDF9', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  heroTarjetaA: { left: -8, bottom: 0, transform: [{ rotate: '-3deg' }] },
  heroTarjetaB: { right: -8, top: 16, transform: [{ rotate: '2deg' }] },
  heroTarjetaHora: { fontSize: 16, lineHeight: 21, fontFamily: poppinsWeight('700'), color: TINTA, fontVariant: ['tabular-nums'] },
  heroTarjetaTexto: { fontSize: 16, lineHeight: 21, color: CUERPO },
  heroCheck: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#4A6B5D', alignItems: 'center', justifyContent: 'center' },

  // cómo funciona
  pasosCaja: { position: 'relative' },
  caminito: { position: 'absolute', left: '8%', right: '8%', top: 60 },
  pasos: { gap: 40 },
  pasosFila: { flexDirection: 'row', gap: 40 },
  paso: { alignItems: 'center', gap: 12 },
  pasoEscena: { width: 200, height: 190, alignItems: 'center', justifyContent: 'center', borderRadius: 100, backgroundColor: '#FBF6EE' },
  etiquetaPaso: { position: 'absolute', top: 6, left: 8, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: '#FFFDF9', borderRadius: 4, transform: [{ rotate: '-6deg' }], ...SOMBRA_PAPEL },
  etiquetaPasoTexto: { fontSize: 14, fontFamily: poppinsWeight('700'), color: colors.accentStrong },

  // ficha
  fichaSeccion: { gap: 32 },
  fichaSeccionFila: { flexDirection: 'row', alignItems: 'center', gap: 64 },
  fichaCaja: { position: 'relative', alignItems: 'center', paddingVertical: 24 },
  fichaEscena: { width: '100%', maxWidth: 520, position: 'relative' },
  fichaHoja: { position: 'absolute', top: 10, left: 10, right: 10, bottom: -6, borderRadius: 18 },
  ficha: { backgroundColor: '#FFFDF9', borderRadius: 18, overflow: 'hidden' },
  fichaCab: { padding: 24, backgroundColor: '#FDF3EE', borderBottomWidth: 1, borderBottomColor: '#EFE8DF' },
  fichaNombre: { fontSize: 24, lineHeight: 32, fontFamily: SERIF_BOLD, color: TINTA },
  fichaSub: { fontSize: 16, lineHeight: 22, color: colors.accentStrong, fontFamily: poppinsWeight('600') },
  fichaCuerpo: { padding: 24, gap: 18 },
  fichaFila: { flexDirection: 'row', gap: 16 },
  fichaSangre: { flex: 1, borderRadius: 12, padding: 14, backgroundColor: '#FDF2F0' },
  fichaEtiqueta: { fontSize: 15, lineHeight: 20, fontFamily: poppinsWeight('600'), color: '#574E49' },
  fichaSangreValor: { fontSize: 40, lineHeight: 48, fontFamily: poppinsWeight('700'), color: '#A6291B' },
  fichaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fichaChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F9DDD5' },
  fichaChipTexto: { fontSize: 16, fontFamily: poppinsWeight('600'), color: '#8C2F1B' },
  fichaContacto: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#EFE8DF' },
  fichaTel: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentStrong, alignItems: 'center', justifyContent: 'center' },
  fichaContactoNombre: { fontSize: 17, lineHeight: 24, fontFamily: poppinsWeight('600'), color: TINTA },
  fichaContactoTel: { fontSize: 22, lineHeight: 30, fontFamily: poppinsWeight('700'), color: colors.accentStrong, fontVariant: ['tabular-nums'] },
  postit: { paddingTop: 18, paddingBottom: 12, paddingHorizontal: 16, borderRadius: 3, maxWidth: 230, ...SOMBRA_PAPEL },
  postitCinta: { position: 'absolute', top: -8, left: 70, width: 64, height: 16, backgroundColor: 'rgba(194, 214, 203, 0.85)', transform: [{ rotate: '-5deg' }] },
  postitTexto: { fontFamily: MANUSCRITA, fontSize: 24, lineHeight: 27, color: '#3B3022' },
  nota1: { position: 'absolute', left: -120, top: -16 },
  flecha1: { position: 'absolute', left: -20, top: 56 },
  nota2: { position: 'absolute', right: -40, top: 150, maxWidth: 190 },
  flecha2: { position: 'absolute', right: 130, top: 168 },
  nota3: { position: 'absolute', right: -30, bottom: -10, maxWidth: 170 },
  flecha3: { position: 'absolute', right: 120, bottom: 30 },

  // casos
  casos: { gap: 24 },
  casosFila: { flexDirection: 'row', alignItems: 'stretch' },
  caso: { backgroundColor: '#FFFDF9', borderRadius: 20, padding: 28, gap: 12 },
  casoProtagonista: { alignItems: 'flex-start', borderTopWidth: 6, borderTopColor: colors.accentStrong },
  casosSecundarios: { gap: 24 },
  casoSecundario: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 20 },
  hechoEn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 48 },
  hechoEnTexto: { fontSize: 20, lineHeight: 28, fontFamily: SERIF_BOLD, color: TINTA },

  // sellos
  sellos: { gap: 48 },
  sellosFila: { flexDirection: 'row', gap: 40 },
  sello: { alignItems: 'center', gap: 12 },
  selloDisco: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFFDF9', alignItems: 'center', justifyContent: 'center' },
  selloAnillo: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(194,70,35,0.5)', alignItems: 'center', justifyContent: 'center' },

  // preguntas
  faq: { gap: 14, maxWidth: 880 },
  faqItem: { backgroundColor: '#FFFDF9', borderRadius: 14 },
  faqPregunta: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 64, paddingHorizontal: 24, paddingVertical: 12 },
  faqRespuesta: { paddingHorizontal: 24, paddingBottom: 20 },

  // cierre
  cierre: { alignItems: 'center', gap: 20, padding: 48, borderRadius: 28, backgroundColor: '#F6E1D8' },
  cierreEscena: { marginBottom: 8 },

  // pie
  pie: { backgroundColor: BANDA, paddingTop: 32 },
  pieFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  pieEnlaces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pieEnlace: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' },
  pieEnlaceTexto: { fontSize: 17, fontFamily: poppinsWeight('600'), color: TINTA, textDecorationLine: 'underline' },
  pieLegal: { fontSize: 16, color: '#574E49' },

  // modal
  modalFondo: { flex: 1, backgroundColor: 'rgba(42,36,33,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#FFFDF9', borderRadius: 18, padding: 28, gap: 12 },
  modalTitulo: { fontSize: 26, lineHeight: 34, fontFamily: SERIF_BOLD, color: TINTA },
});
