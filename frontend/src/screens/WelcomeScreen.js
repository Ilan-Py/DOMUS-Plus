import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import { LogoConNombre } from '../components/Logo';
import PrimaryButton from '../components/PrimaryButton';
import PressScale from '../components/PressScale';
import FadeSlideIn from '../components/FadeSlideIn';
import { Subrayado, Chispas, FlechaCurva } from '../components/FamilyDoodles';
import Svg, { Path } from 'react-native-svg';
import PaperCutout from '../components/PaperCutout';
import { paper } from '../theme/paper';

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
    title: 'Ficha de emergencia',
    text: 'Alergias, grupo sanguíneo y contactos en un toque.',
    preview: 'Grupo O+ · Alérgico a penicilina',
    previewIcon: 'water',
  },
  {
    icon: 'calendar-outline',
    title: 'Calendario compartido',
    text: 'Toda la familia ve los mismos recordatorios.',
    preview: 'Hoy 20:00 · Amoxicilina de Alfio',
    previewIcon: 'time-outline',
  },
  {
    icon: 'paw-outline',
    title: 'Personas y mascotas',
    text: 'Llevá el control incluso de quienes no usan la app.',
    preview: 'Mónica · José · Fatiga',
    previewIcon: 'people-outline',
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
    title: 'Cuidar a tus padres a la distancia',
    text: 'Mirá si ya tomaron la medicación o cuándo tienen turno, sin llamar a cada rato.',
  },
  {
    icon: 'paw-outline',
    title: 'Tener al día a tus mascotas',
    text: 'Vacunas y antiparasitarios compartidos entre todos los que viven en casa.',
  },
];

const CERTEZAS = [
  { icon: 'lock-closed-outline', text: 'Solo lo ve tu grupo familiar' },
  { icon: 'ban-outline', text: 'Sin publicidad' },
  { icon: 'text-outline', text: 'Letra grande y clara' },
];

// Tarjeta de papel apoyada sobre la foto: borde blanco, sombra cálida en dos capas y micro-elevación
// al pasar el mouse (CSS global, ver theme/paper.js). Entra una sola vez, escalonada (`d`), sin
// movimiento continuo — antes flotaba en loop. Con "reducir movimiento" aparece directa.
function TarjetaFlotante({ style, d, children }) {
  return (
    <View {...paper('cutout', 'pop', d)} style={[styles.flotante, style]}>
      {children}
    </View>
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
        <View style={styles.benefitHead}>
          <Ionicons name={item.icon} size={28} color={colors.accentStrong} />
          <Text style={styles.benefitTitle}>{item.title}</Text>
        </View>
        <Text style={styles.benefitText}>{item.text}</Text>
        {/* Un dato real, tal como se ve en la app (sin cajitas de color) */}
        <View style={styles.dato}>
          <Ionicons name={item.previewIcon} size={18} color={colors.textBody} />
          <Text style={styles.datoText}>{item.preview}</Text>
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
        {/* Un solo botón fuerte: iniciar sesión y el código de invitación viven en el encabezado
            (en celular, el código queda como enlace discreto debajo). */}
        <View style={isDesktop ? styles.ctaUnico : null}>
          <PrimaryButton title="Crear cuenta" variant="accent" onPress={irRegistro} />
        </View>
        {compacto && (
          <PressScale
            contentStyle={styles.inviteRow}
            onPress={irRegistro}
            accessibilityLabel="Me invitaron a un grupo familiar: crear cuenta para unirme con un código"
          >
            <Text style={styles.inviteText}>
              ¿Te invitaron a un grupo? <Text style={styles.inviteLink}>Unite con tu código</Text>
            </Text>
          </PressScale>
        )}
      </FadeSlideIn>
    </View>
  );

  // ---------- foto + tarjetas flotantes ----------
  const foto = (
    <FadeSlideIn index={4} style={styles.photoStageWrap}>
      <View style={styles.photoStage}>
        <View style={styles.photoFrame}>
          <Image
            source={require('../../assets/welcome-family.jpg')}
            style={styles.photo}
            resizeMode="cover"
            accessibilityLabel="Abuelos, una nena y su perro sentados juntos en un banco del parque"
          />
        </View>

        {/* Tarjeta A (abajo a la izquierda): próximo recordatorio */}
        <TarjetaFlotante style={compacto ? styles.cardAc : styles.cardA} d="d2">
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
        <TarjetaFlotante style={compacto ? styles.cardBc : styles.cardB} d="d3">
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

        {/* Dos stickers de papel chicos, decorativos, que entran después de las tarjetas */}
        <PaperCutout icon="heart" tinte="terracota" size={compacto ? 44 : 58} rotate={-10} delay={360} style={compacto ? styles.stickerHeartC : styles.stickerHeart} />
        <PaperCutout icon="paw" tinte="salvia" size={compacto ? 40 : 52} rotate={12} delay={450} style={compacto ? styles.stickerPawC : styles.stickerPaw} />
      </View>
    </FadeSlideIn>
  );

  return (
    <View style={styles.root}>
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
                <Ionicons name={e.icon} size={32} color={colors.accentStrong} />
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
              <PrimaryButton title="Crear cuenta" variant="accent" onPress={irRegistro} />
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
    borderRadius: radii.control,
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
  keyWrap: { alignSelf: 'flex-start', position: 'relative', paddingBottom: 8 },
  underline: { position: 'absolute', left: 0, right: 0, bottom: -2 },
  subtext: { fontSize: 18, lineHeight: 28, color: '#3F3631', maxWidth: 520 },
  subtextDesktop: { fontSize: 19, lineHeight: 30 },
  ctaUnico: { width: 240 },
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
  photoFrame: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: BORDE, backgroundColor: colors.surfaceSand },
  photo: { width: '100%', aspectRatio: FOTO_ASPECTO },
  flotante: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDE,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...SOMBRA_CALIDA,
  },
  cardA: { left: -28, bottom: -24 },
  cardB: { right: -20, top: 28 },
  cardAc: { left: -6, bottom: -20, paddingVertical: 8, paddingHorizontal: 12 },
  cardBc: { right: -6, top: 12, paddingVertical: 8, paddingHorizontal: 12 },
  stickerHeart: { position: 'absolute', left: -18, top: -22 },
  stickerHeartC: { position: 'absolute', left: -6, top: -16 },
  stickerPaw: { position: 'absolute', right: 30, bottom: -30 },
  stickerPawC: { position: 'absolute', right: 14, bottom: -26 },
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
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDE,
    ...SOMBRA_CALIDA,
  },
  benefitHover: { borderColor: '#E8B9A5' },
  benefitHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EFE8DF' },
  datoText: { flex: 1, fontVariant: ['tabular-nums'], fontSize: 15, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.ink },
  benefitTitle: { fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink },
  benefitText: { fontSize: 16, lineHeight: 24, color: '#3F3631' },

  // ---- títulos de sección
  tituloSeccion: { gap: 8, marginBottom: 28 },
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
  leyenda: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 48 },
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDE,
    overflow: 'visible',
    ...SOMBRA_CALIDA,
  },
  maquetaHead: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#EFE8DF', backgroundColor: '#FDF3EE', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  maquetaTitle: { fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink },
  maquetaSub: { fontSize: 14, lineHeight: 20, color: '#3F3631' },
  maquetaBody: { padding: 20, gap: 16 },
  maquetaRow: { flexDirection: 'row', gap: 12 },
  maquetaBlood: { flex: 1, borderRadius: 10, padding: 12, backgroundColor: '#FDF2F0' },
  maquetaLabel: { fontSize: 14, lineHeight: 20, fontFamily: poppinsWeight('600'), color: '#574E49' },
  maquetaBloodValue: { fontSize: 30, lineHeight: 38, fontFamily: poppinsWeight('700'), color: '#A6291B' },
  maquetaAllergies: { flex: 1.4, justifyContent: 'center' },
  maquetaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  maquetaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F9DDD5' },
  maquetaChipText: { fontSize: 14, fontFamily: poppinsWeight('600'), color: '#8C2F1B' },
  maquetaContacto: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EFE8DF' },
  maquetaPhone: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FDF2F0', alignItems: 'center', justifyContent: 'center' },
  maquetaContactName: { fontSize: 15, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.ink },
  maquetaContactTel: { fontVariant: ['tabular-nums'], fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.accentStrong, textDecorationLine: 'underline' },

  // ---- escenarios
  escenarios: { gap: 16 },
  escenariosRow: { flexDirection: 'row', gap: 20 },
  escenario: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: BORDE, ...SOMBRA_CALIDA },
  escenarioCell: { flex: 1 },
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
