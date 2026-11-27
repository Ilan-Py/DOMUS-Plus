import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import Logo, { LogoConNombre } from '../components/Logo';
import PrimaryButton from '../components/PrimaryButton';
import PressScale from '../components/PressScale';
import FadeSlideIn from '../components/FadeSlideIn';
import { Subrayado, Chispas, FlechaCurva } from '../components/FamilyDoodles';
import Svg, { Path, Pattern, Rect, Defs, Circle } from 'react-native-svg';

// Landing de DOMUS+ (ver DESIGN.md). Pantalla única, sin carrusel.
const DESKTOP_BREAKPOINT = 900;
const CONTAINER_MAX_WIDTH = 1140;
const MOBILE_MARGIN = 24;
const BORDE = 'rgba(42, 36, 33, 0.1)'; // borde fino cálido
// Tres niveles de superficie: fondo base (#FBF6EE) → bandas en un crema más profundo
// → tarjetas blancas con sombra cálida (tinte rgba(42,36,33,0.06), nunca gris frío).
const BANDA = '#F3EAE0';
const SOMBRA_CALIDA = {
  shadowColor: '#2A2421',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 24,
  elevation: 2,
};

// Foto de uso libre (CC0, StockSnap, vía Openverse): assets/welcome-family.jpg, 600×380.
const FOTO_ASPECTO = 600 / 380;

const BENEFITS = [
  {
    icon: 'medkit-outline',
    bg: '#F7DED2', // terracota pastel
    fg: '#A64B2A',
    title: 'Ficha de emergencia',
    text: 'Alergias, grupo sanguíneo y contactos en un toque.',
    preview: 'Grupo O+ · Alérgico a penicilina',
    previewIcon: 'water',
    previewColor: '#A6291B',
    previewBg: '#FDF2F0',
  },
  {
    icon: 'calendar-outline',
    bg: '#D6E2D6', // verde salvia claro
    fg: '#3E6340',
    title: 'Calendario compartido',
    text: 'Toda la familia ve los mismos recordatorios.',
    preview: 'Hoy 20:00 · Amoxicilina de Alfio',
    previewIcon: 'time-outline',
    previewColor: '#3E6340',
    previewBg: '#EEF3EC',
  },
  {
    icon: 'paw-outline',
    bg: '#DCEBF2', // celeste suave
    fg: '#2F6F8F',
    title: 'Personas y mascotas',
    text: 'Llevá el control incluso de quienes no usan la app.',
    preview: 'Mónica · José · Fatiga',
    previewIcon: 'people-outline',
    previewColor: '#2F6F8F',
    previewBg: '#EAF3F7',
  },
];

const PASOS = [
  { n: '1', title: 'Creás tu grupo familiar', text: 'Tu cuenta y un nombre para la familia: listo en un minuto.' },
  { n: '2', title: 'Sumás personas y mascotas', text: 'Aunque no usen la app: cargás sus vacunas, tratamientos y contactos.' },
  { n: '3', title: 'Todos reciben los avisos', text: 'Cada recordatorio le llega a toda la familia, sin que nadie se olvide.' },
];

const ESCENARIOS = [
  {
    icon: 'heart-outline',
    bg: '#F7DED2',
    fg: '#A64B2A',
    title: 'Cuidar a tus padres a la distancia',
    text: 'Mirá si ya tomaron la medicación o cuándo tienen turno, sin llamar a cada rato.',
  },
  {
    icon: 'paw-outline',
    bg: '#D6E2D6',
    fg: '#3E6340',
    title: 'Tener al día a tus mascotas',
    text: 'Vacunas y antiparasitarios compartidos entre todos los que viven en casa.',
  },
];

const CERTEZAS = [
  { icon: 'lock-closed-outline', text: 'Solo lo ve tu grupo familiar' },
  { icon: 'ban-outline', text: 'Sin publicidad' },
  { icon: 'text-outline', text: 'Letra grande y clara' },
];

// ¿El sistema pide reducir el movimiento?
function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);
  return reduce;
}

// Tarjeta flotante sobre la foto: un movimiento vertical muy leve (quieta si el
// sistema pide reducir el movimiento).
function TarjetaFlotante({ style, desfase = 0, reduce, children }) {
  const flota = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return undefined;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(flota, { toValue: 1, duration: 2600, delay: desfase, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flota, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [flota, reduce, desfase]);
  const translateY = flota.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  return <Animated.View style={[styles.flotante, style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
}

// Textura de papel: puntitos casi invisibles (2–3 %) sobre todo el lienzo.
function GranoDePapel() {
  const puntos = [[3, 5], [11, 29], [19, 13], [27, 37], [35, 21], [7, 17], [23, 3], [31, 9], [15, 33], [39, 31], [1, 23], [29, 27]];
  return (
    <Svg width="100%" height="100%" style={styles.grano} accessibilityElementsHidden importantForAccessibility="no">
      <Defs>
        <Pattern id="grano" patternUnits="userSpaceOnUse" width="40" height="40">
          {puntos.map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.9 : 0.6} fill="#2A2421" />
          ))}
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#grano)" opacity={0.045} />
    </Svg>
  );
}

// Forma orgánica definida detrás de la foto del hero.
function FormaOrganica() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 560 420" preserveAspectRatio="none" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      <Path
        d="M52 92 C 20 34 120 -2 214 18 C 300 36 392 -14 480 40 C 566 92 548 214 524 290 C 500 366 400 410 300 398 C 200 386 118 420 62 360 C 6 300 84 150 52 92 Z"
        fill="#F4DCCB"
        fillOpacity={0.75}
      />
    </Svg>
  );
}

// Sección de ancho completo con su fondo (base o banda) y el contenido centrado.
function Seccion({ fondo, children, style }) {
  return (
    <View style={[styles.seccion, fondo && { backgroundColor: fondo }, style]}>
      <View style={styles.seccionInner}>{children}</View>
    </View>
  );
}

function TituloSeccion({ children, sub }) {
  return (
    <View style={styles.tituloSeccion}>
      <Text style={styles.h2} accessibilityRole="header">{children}</Text>
      {!!sub && <Text style={styles.h2Sub}>{sub}</Text>}
    </View>
  );
}

// Maqueta de la ficha de emergencia con tres marcas numeradas (la leyenda va al lado).
function MaquetaFicha() {
  const Marca = ({ n, style }) => (
    <View style={[styles.marca, style]} accessibilityElementsHidden importantForAccessibility="no">
      <Text style={styles.marcaText}>{n}</Text>
    </View>
  );
  return (
    <View style={styles.maqueta} accessibilityLabel="Vista previa de la ficha de emergencia de María Elena">
      <View style={styles.maquetaHead}>
        <Text style={styles.maquetaTitle}>María Elena Argento</Text>
        <Text style={styles.maquetaSub}>Ficha de emergencia</Text>
        <Marca n="1" style={styles.marca3} />
      </View>
      <View style={styles.maquetaBody}>
        <View>
          <View style={styles.maquetaRow}>
            <View style={styles.maquetaBlood}>
              <Text style={styles.maquetaLabel}>Tipo de sangre</Text>
              <Text style={styles.maquetaBloodValue}>O+</Text>
            </View>
            <View style={styles.maquetaAllergies}>
              <Text style={styles.maquetaLabel}>Alergias</Text>
              <View style={styles.maquetaChips}>
                <View style={styles.maquetaChip}><Text style={styles.maquetaChipText}>Penicilina</Text></View>
                <View style={styles.maquetaChip}><Text style={styles.maquetaChipText}>Maní</Text></View>
              </View>
            </View>
          </View>
          <Marca n="2" style={styles.marca1} />
        </View>

        <View style={styles.maquetaContacto}>
          <View style={styles.maquetaPhone}>
            <Ionicons name="call" size={18} color="#C24623" />
          </View>
          <View>
            <Text style={styles.maquetaContactName}>Mónica · Hija</Text>
            <Text style={styles.maquetaContactTel}>11 5555 0101</Text>
          </View>
          <Marca n="3" style={styles.marca2} />
        </View>
      </View>
    </View>
  );
}

function BeneficioCard({ item }) {
  const [hover, setHover] = useState(false);
  return (
    <View style={[styles.benefitWrap, Platform.OS === 'web' && styles.benefitWrapWeb, hover && styles.benefitWrapHover]}>
      <PressScale
        contentStyle={[styles.benefit, hover && styles.benefitHover]}
        onPress={() => {}}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        accessibilityLabel={`${item.title}. ${item.text}`}
      >
        <View style={[styles.benefitIcon, { backgroundColor: item.bg }]}>
          <Ionicons name={item.icon} size={30} color={item.fg} />
        </View>
        <Text style={styles.benefitTitle}>{item.title}</Text>
        <Text style={styles.benefitText}>{item.text}</Text>
        {/* Un ejemplo real de lo que se ve en la app */}
        <View style={[styles.preview, { backgroundColor: item.previewBg }]}>
          <Ionicons name={item.previewIcon} size={16} color={item.previewColor} />
          <Text style={[styles.previewText, { color: item.previewColor }]}>{item.preview}</Text>
        </View>
      </PressScale>
    </View>
  );
}

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const compacto = !isDesktop;
  const reduce = useReduceMotion();

  const irLogin = () => navigation.navigate('Login');
  const irRegistro = () => navigation.navigate('Register');

  // ---------- encabezado ----------
  const header = (
    <FadeSlideIn index={0}>
      <View style={styles.header}>
        <LogoConNombre variante="terracota" size={36} />
        <View style={styles.headerRight}>
          <PressScale contentStyle={styles.headerLink} onPress={irLogin} accessibilityLabel="Iniciar sesión">
            <Text style={styles.headerLinkText}>Iniciar sesión</Text>
          </PressScale>
          {isDesktop && (
            <PressScale
              contentStyle={styles.headerPill}
              onPress={irRegistro}
              accessibilityLabel="Tengo un código de invitación"
            >
              <Text style={styles.headerPillText}>Tengo un código de invitación</Text>
            </PressScale>
          )}
        </View>
      </View>
    </FadeSlideIn>
  );

  // ---------- columna de texto ----------
  const textColumn = (
    <View style={styles.textColumn}>
      <FadeSlideIn index={1}>
        <View>
          <Text style={[styles.headline, isDesktop && styles.headlineDesktop]} accessibilityRole="header">
            Las vacunas y los tratamientos de tu
          </Text>
          {/* Palabra clave con un subrayado a mano en terracota suave */}
          <View style={styles.keyWrap}>
            <Text style={[styles.headline, isDesktop && styles.headlineDesktop]}>familia y tus mascotas.</Text>
            <View style={styles.underline} pointerEvents="none">
              <Subrayado />
            </View>
          </View>
        </View>
      </FadeSlideIn>

      <FadeSlideIn index={2}>
        <Text style={[styles.subtext, isDesktop && styles.subtextDesktop]}>
          Guardá los comprobantes, anotá los contactos de emergencia y recibí un aviso antes de cada control o dosis.
        </Text>
      </FadeSlideIn>

      <FadeSlideIn index={3}>
        <View style={[styles.ctas, isDesktop && styles.ctasRow]}>
          <View style={isDesktop ? styles.ctaCell : null}>
            <PrimaryButton title="Crear cuenta" variant="accent" onPress={irRegistro} />
          </View>
          <View style={isDesktop ? styles.ctaCell : null}>
            <PrimaryButton title="Iniciar sesión" variant="secondary" onPress={irLogin} />
          </View>
        </View>
        <PressScale
          contentStyle={styles.inviteRow}
          onPress={irRegistro}
          accessibilityLabel="Me invitaron a un grupo familiar: crear cuenta para unirme con un código"
        >
          <Text style={styles.inviteText}>
            ¿Te invitaron a un grupo? <Text style={styles.inviteLink}>Unite con tu código</Text>
          </Text>
        </PressScale>
      </FadeSlideIn>
    </View>
  );

  // ---------- foto + tarjetas flotantes ----------
  const foto = (
    <FadeSlideIn index={4} style={styles.photoStageWrap}>
      <View style={styles.photoStage}>
        <View style={styles.blob} pointerEvents="none"><FormaOrganica /></View>
        {/* Isotipo como marca de agua, asomando detrás de la esquina superior derecha */}
        <View style={styles.watermark} pointerEvents="none">
          <Logo variante="terracota" size={isDesktop ? 220 : 150} />
        </View>

        <View style={styles.photoFrame}>
          <Image
            source={require('../../assets/welcome-family.jpg')}
            style={styles.photo}
            resizeMode="cover"
            accessibilityLabel="Abuelos, una nena y su perro sentados juntos en un banco del parque"
          />
        </View>

        {/* Tarjeta A (abajo a la izquierda): próximo recordatorio */}
        <TarjetaFlotante style={compacto ? styles.cardAc : styles.cardA} reduce={reduce}>
          <View style={[styles.cardIcon, { backgroundColor: '#D6E2D6' }]}>
            <Ionicons name="paw" size={compacto ? 18 : 22} color="#3E6340" />
          </View>
          <View>
            <Text style={[styles.cardWhen, compacto && styles.cardWhenC]}>Mañana 10:00</Text>
            <Text style={[styles.cardWhat, compacto && styles.cardWhatC]}>Vacuna de Toby</Text>
          </View>
        </TarjetaFlotante>
        {!compacto && (
          <View style={styles.sparksA} pointerEvents="none">
            <Chispas size={56} />
          </View>
        )}

        {/* Tarjeta B (arriba a la derecha): recordatorio cumplido */}
        <TarjetaFlotante style={compacto ? styles.cardBc : styles.cardB} desfase={900} reduce={reduce}>
          <View>
            <Text style={[styles.cardWhen, compacto && styles.cardWhenC]}>Hoy 18:00</Text>
            <Text style={[styles.cardWhat, compacto && styles.cardWhatC]}>Enalapril — Marta</Text>
          </View>
          <View style={styles.doneBadge} accessibilityLabel="Hecho">
            <Ionicons name="checkmark" size={compacto ? 16 : 18} color="#FFFFFF" />
          </View>
        </TarjetaFlotante>
        {!compacto && (
          <View style={styles.arrowB} pointerEvents="none">
            <FlechaCurva size={56} color="#FFFFFF" opacidad={0.95} />
          </View>
        )}
      </View>
    </FadeSlideIn>
  );

  return (
    <View style={styles.root}>
      <GranoDePapel />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Nivel 1: fondo base */}
        <Seccion>
          {header}
          <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
            <View style={isDesktop ? styles.heroLeft : null}>{textColumn}</View>
            <View style={isDesktop ? styles.heroRight : styles.heroRightMobile}>{foto}</View>
          </View>
        </Seccion>

        {/* Beneficios con vista previa */}
        <Seccion style={styles.seccionAire}>
          <View style={[styles.benefits, isDesktop && styles.benefitsDesktop]}>
            {BENEFITS.map((b, i) => (
              <FadeSlideIn key={b.title} index={5 + i} style={isDesktop ? styles.benefitCell : null}>
                <BeneficioCard item={b} />
              </FadeSlideIn>
            ))}
          </View>
        </Seccion>

        {/* Nivel 2: banda crema más profunda — cómo funciona */}
        <Seccion fondo={BANDA} style={styles.seccionAire}>
          <TituloSeccion sub="Sin vueltas ni formularios largos.">Cómo funciona</TituloSeccion>
          <View style={[styles.pasos, isDesktop && styles.pasosRow]}>
            {PASOS.map((p, i) => (
              <View key={p.n} style={[styles.paso, isDesktop && styles.pasoCell]}>
                {isDesktop && i < PASOS.length - 1 && <View style={styles.conector} pointerEvents="none" />}
                <View style={styles.pasoNum}><Text style={styles.pasoNumText}>{p.n}</Text></View>
                <Text style={styles.pasoTitle}>{p.title}</Text>
                <Text style={styles.pasoText}>{p.text}</Text>
              </View>
            ))}
          </View>
        </Seccion>

        {/* Vista previa real de la app */}
        <Seccion style={styles.seccionAire}>
          <View style={[styles.preview2, isDesktop && styles.preview2Row]}>
            <View style={isDesktop ? styles.preview2Left : null}>
              <TituloSeccion sub="Lo importante a la vista, aunque estés apurado.">Así se ve la ficha de emergencia</TituloSeccion>
              {[
                ['1', 'Toda la familia ve la misma ficha'],
                ['2', 'Grupo sanguíneo y alergias, a la vista'],
                ['3', 'Teléfonos de contacto: un toque y llama'],
              ].map(([n, t]) => (
                <View key={n} style={styles.leyenda}>
                  <View style={styles.marcaLeyenda}><Text style={styles.marcaText}>{n}</Text></View>
                  <Text style={styles.leyendaText}>{t}</Text>
                </View>
              ))}
            </View>
            <View style={isDesktop ? styles.preview2Right : styles.preview2RightMobile}>
              <MaquetaFicha />
            </View>
          </View>
        </Seccion>

        {/* Escenarios reales */}
        <Seccion fondo={BANDA} style={styles.seccionAire}>
          <TituloSeccion>Para qué la usan</TituloSeccion>
          <View style={[styles.escenarios, isDesktop && styles.escenariosRow]}>
            {ESCENARIOS.map((e) => (
              <View key={e.title} style={[styles.escenario, isDesktop && styles.escenarioCell]}>
                <View style={[styles.escenarioIcon, { backgroundColor: e.bg }]}>
                  <Ionicons name={e.icon} size={30} color={e.fg} />
                </View>
                <View style={styles.escenarioTexto}>
                  <Text style={styles.escenarioTitle}>{e.title}</Text>
                  <Text style={styles.escenarioDesc}>{e.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </Seccion>

        {/* Confianza */}
        <Seccion style={styles.seccionConfianza}>
          <View style={[styles.certezas, isDesktop && styles.certezasRow]}>
            {CERTEZAS.map((c) => (
              <View key={c.text} style={styles.certeza}>
                <Ionicons name={c.icon} size={22} color={colors.accentStrong} />
                <Text style={styles.certezaText}>{c.text}</Text>
              </View>
            ))}
          </View>
        </Seccion>

        {/* Cierre */}
        <Seccion fondo={BANDA} style={styles.seccionPie}>
          <View style={styles.pie}>
            <LogoConNombre variante="terracota" size={40} />
            <Text style={styles.pieText}>Creá tu grupo familiar gratis</Text>
            <View style={styles.pieCta}>
              <PrimaryButton title="Crear cuenta" variant="accent" onPress={irRegistro} fullWidth={!isDesktop} />
            </View>
            <Text style={styles.legal}>© 2026 DOMUS+</Text>
          </View>
        </Seccion>
        <View style={{ height: insets.bottom + 8, backgroundColor: BANDA }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  grano: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  seccion: { width: '100%' },
  seccionInner: { width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: MOBILE_MARGIN },
  seccionAire: { paddingVertical: 56 },
  seccionConfianza: { paddingVertical: 40 },
  seccionPie: { paddingVertical: 56 },

  // ---- encabezado
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLink: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' },
  headerLinkText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  headerPill: {
    minHeight: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDE,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  headerPillText: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.accentStrong },

  // ---- hero
  hero: { marginTop: 24, gap: 40 },
  heroDesktop: { flexDirection: 'row', alignItems: 'center', gap: 56, marginTop: 40 },
  heroLeft: { flex: 1 },
  heroRight: { flex: 1, alignItems: 'center' },
  heroRightMobile: { alignItems: 'center' },
  textColumn: { gap: 20 },
  headline: { fontSize: 32, lineHeight: 40, fontFamily: SERIF_BOLD, color: colors.ink },
  headlineDesktop: { fontSize: 44, lineHeight: 54 },
  keyWrap: { alignSelf: 'flex-start', position: 'relative', paddingBottom: 6 },
  underline: { position: 'absolute', left: 0, right: 0, bottom: -2 },
  subtext: { fontSize: 18, lineHeight: 28, color: '#3F3631', maxWidth: 520 },
  subtextDesktop: { fontSize: 19, lineHeight: 30 },
  ctas: { gap: 16 },
  ctasRow: { flexDirection: 'row' },
  ctaCell: { flex: 1, maxWidth: 240 },
  inviteRow: { minHeight: 52, justifyContent: 'center', marginTop: 4 },
  inviteText: { fontSize: 16, lineHeight: 24, color: '#3F3631' },
  inviteLink: {
    fontFamily: poppinsWeight('600'),
    color: colors.accentStrong,
    textDecorationLine: 'underline',
  },

  // ---- foto y tarjetas flotantes
  photoStageWrap: { width: '100%', alignItems: 'center' },
  photoStage: { width: '100%', maxWidth: 560, position: 'relative', marginBottom: 28 },
  blob: { position: 'absolute', left: -28, right: 24, top: 36, bottom: -36 },
  watermark: { position: 'absolute', top: -44, right: -44, opacity: 0.07 },
  photoFrame: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: BORDE, backgroundColor: colors.surfaceSand },
  photo: { width: '100%', aspectRatio: FOTO_ASPECTO },
  flotante: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDE,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...SOMBRA_CALIDA,
  },
  cardA: { left: -28, bottom: -24 },
  cardB: { right: -20, top: 28 },
  cardAc: { left: -6, bottom: -20, paddingVertical: 8, paddingHorizontal: 10 },
  cardBc: { right: -6, top: 12, paddingVertical: 8, paddingHorizontal: 10 },
  sparksA: { position: 'absolute', left: 168, bottom: -34 },
  sparksAc: { position: 'absolute', left: 130, bottom: -30 },
  arrowB: { position: 'absolute', right: 150, top: 78 },
  cardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardWhen: { fontVariant: ['tabular-nums'], fontSize: 15, lineHeight: 20, fontFamily: poppinsWeight('700'), color: colors.ink },
  cardWhenC: { fontSize: 14, lineHeight: 18 },
  cardWhat: { fontSize: 15, lineHeight: 20, color: '#3F3631' },
  cardWhatC: { fontSize: 14, lineHeight: 18 },
  doneBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#5E8A63', alignItems: 'center', justifyContent: 'center' },

  // ---- beneficios
  benefits: { gap: 16 },
  benefitsDesktop: { flexDirection: 'row', gap: 20 },
  benefitCell: { flex: 1 },
  benefitWrap: { width: '100%' },
  benefitWrapWeb: { transitionProperty: 'transform', transitionDuration: '150ms', transitionTimingFunction: 'ease-out' },
  benefitWrapHover: { transform: [{ translateY: -2 }] },
  benefit: {
    padding: 24,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDE,
    ...SOMBRA_CALIDA,
  },
  benefitHover: { borderColor: '#E8B9A5' },
  benefitIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  previewText: { fontSize: 14, lineHeight: 20, fontFamily: poppinsWeight('600') },
  benefitTitle: { fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink },
  benefitText: { fontSize: 16, lineHeight: 24, color: '#3F3631' },

  // ---- títulos de sección
  tituloSeccion: { gap: 6, marginBottom: 28 },
  h2: { fontSize: 28, lineHeight: 36, fontFamily: SERIF_BOLD, color: colors.ink },
  h2Sub: { fontSize: 17, lineHeight: 26, color: '#3F3631' },

  // ---- cómo funciona
  pasos: { gap: 20 },
  pasosRow: { flexDirection: 'row', gap: 32 },
  paso: { gap: 8, position: 'relative' },
  conector: { position: 'absolute', top: 24, left: 60, right: -20, borderTopWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(194, 70, 35, 0.35)' },
  pasoCell: { flex: 1 },
  pasoNum: { zIndex: 1, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentStrong, alignItems: 'center', justifyContent: 'center' },
  pasoNumText: { fontSize: 22, fontFamily: poppinsWeight('700'), color: '#FFFFFF' },
  pasoTitle: { fontSize: 19, lineHeight: 27, fontFamily: poppinsWeight('700'), color: colors.ink },
  pasoText: { fontSize: 16, lineHeight: 25, color: '#3F3631' },

  // ---- vista previa de la app
  preview2: { gap: 32 },
  preview2Row: { flexDirection: 'row', alignItems: 'center', gap: 56 },
  preview2Left: { flex: 1 },
  preview2Right: { flex: 1, alignItems: 'center' },
  preview2RightMobile: { alignItems: 'center' },
  leyenda: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48 },
  marcaLeyenda: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentStrong, alignItems: 'center', justifyContent: 'center' },
  leyendaText: { flex: 1, fontSize: 17, lineHeight: 25, color: colors.ink },
  marca: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentStrong, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  marcaText: { fontSize: 15, fontFamily: poppinsWeight('700'), color: '#FFFFFF' },
  marca1: { right: -10, top: -10 },
  marca2: { right: -10, top: -10 },
  marca3: { right: 16, top: 14 },
  maqueta: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDE,
    overflow: 'visible',
    ...SOMBRA_CALIDA,
  },
  maquetaHead: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#EFE8DF', backgroundColor: '#FDF3EE', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  maquetaTitle: { fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink },
  maquetaSub: { fontSize: 14, lineHeight: 20, color: '#3F3631' },
  maquetaBody: { padding: 18, gap: 16 },
  maquetaRow: { flexDirection: 'row', gap: 12 },
  maquetaBlood: { flex: 1, borderRadius: 12, padding: 12, backgroundColor: '#FDF2F0' },
  maquetaLabel: { fontSize: 14, lineHeight: 20, fontFamily: poppinsWeight('600'), color: '#574E49' },
  maquetaBloodValue: { fontSize: 30, lineHeight: 38, fontFamily: poppinsWeight('700'), color: '#A6291B' },
  maquetaAllergies: { flex: 1.4, justifyContent: 'center' },
  maquetaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  maquetaChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F9DDD5' },
  maquetaChipText: { fontSize: 14, fontFamily: poppinsWeight('600'), color: '#8C2F1B' },
  maquetaContacto: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EFE8DF' },
  maquetaPhone: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FDF2F0', alignItems: 'center', justifyContent: 'center' },
  maquetaContactName: { fontSize: 15, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.ink },
  maquetaContactTel: { fontVariant: ['tabular-nums'], fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.accentStrong, textDecorationLine: 'underline' },

  // ---- escenarios
  escenarios: { gap: 16 },
  escenariosRow: { flexDirection: 'row', gap: 20 },
  escenario: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: BORDE, ...SOMBRA_CALIDA },
  escenarioCell: { flex: 1 },
  escenarioIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  escenarioTexto: { flex: 1, gap: 4 },
  escenarioTitle: { fontSize: 19, lineHeight: 27, fontFamily: poppinsWeight('700'), color: colors.ink },
  escenarioDesc: { fontSize: 16, lineHeight: 25, color: '#3F3631' },

  // ---- confianza y cierre
  certezas: { gap: 16 },
  certezasRow: { flexDirection: 'row', justifyContent: 'space-between' },
  certeza: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  certezaText: { fontSize: 17, lineHeight: 25, fontFamily: poppinsWeight('600'), color: colors.ink },
  pie: { alignItems: 'center', gap: 20 },
  pieText: { fontSize: 20, lineHeight: 30, fontFamily: SERIF_BOLD, color: colors.ink, textAlign: 'center', maxWidth: 520 },
  pieCta: { width: '100%', maxWidth: 280 },
  legal: { fontSize: 14, lineHeight: 20, color: '#574E49', marginTop: 8 },
});
