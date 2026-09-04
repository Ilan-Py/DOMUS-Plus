import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, shadow } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';

// Generaliza el segmentado tipoMiembro ('integrante'/'mascota') de
// AddMemberScreen. No asume dos opciones ni valores específicos —
// reutilizable para el enum `tipo` de AddReminderScreen (UI-5).

// BlurView real en iOS/Android; en web backdropFilter vía CSS directo (mismo
// patrón que Login/Register/topbars). Intensidad más baja que en los cards
// grandes (22 vs 40) — el track es chico y una intensidad alta se ve como
// una mancha desenfocada en vez de vidrio esmerilado. sageTranslucent sigue
// siendo alpha 0.55 real (no aplanado a sólido en la migración 2), así que
// el blur acá sigue teniendo efecto — a diferencia de los headers, donde se
// sacó por estar detrás de un fondo ya opaco.
const webTrackBlurStyle = Platform.select({
  web: { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' },
  default: {},
});

// Spring sin rebote (bounciness 0) — llega rápido pero no overshootea. Se
// eligió spring en vez de un Animated.timing de duración fija porque acá los
// segmentos tienen ancho variable: un timing a duración fija hace que un
// salto corto (al vecino) tarde exactamente lo mismo que uno largo (al
// extremo opuesto), lo que se siente mecánico/artificial. Un spring escala
// su tiempo de asentamiento con la distancia real recorrida, más parecido a
// cómo se comporta un segmented control nativo (iOS/Android). Mismo config
// para el pill (posición+ancho) y para el crossfade de texto de cada
// segmento, así quedan visualmente sincronizados aunque sean Animated.Value
// separados — no existe una única forma de compartir literalmente el mismo
// valor entre "posición en píxeles" (rango abierto) y "progreso de color por
// segmento" (0–1 por segmento, sólo dos activos a la vez).
const SPRING_CONFIG = { bounciness: 0, speed: 16, useNativeDriver: false };

// Cada segmento anima su propio color de texto (0 = inactivo/oscuro, 1 =
// activo/blanco) en un componente aparte — así el hook de animación vive en
// una instancia por segmento con lifecycle propio, en vez de llamarse
// condicionalmente adentro de un .map() en el padre. forwardRef porque el
// padre necesita el handle nativo para medir su layout on-demand (ver
// SegmentedControl más abajo) — sin esto no hay forma de llamar
// .measureLayout() sobre este segmento en particular.
const Segment = React.forwardRef(function Segment({ option, active, onPress }, ref) {
  const colorAnim = useRef(new Animated.Value(active ? 1 : 0)).current;
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      // Primer render — ya arranca en su color final (activo o no), sin
      // crossfade desde un estado que nunca existió.
      mountedRef.current = true;
      return;
    }
    Animated.spring(colorAnim, { toValue: active ? 1 : 0, ...SPRING_CONFIG }).start();
  }, [active, colorAnim]);

  const color = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.textMuted, colors.onAccent],
  });

  return (
    <TouchableOpacity
      ref={ref}
      style={[styles.segItem, active && styles.segItemActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Animated.Text style={[styles.segItemText, { color }]}>{option.label}</Animated.Text>
    </TouchableOpacity>
  );
});

export default function SegmentedControl({ options, selectedValue, onChange, style }) {
  const trackRef = useRef(null); // View plana interna, ancla para medir (ver render: no es la BlurView)
  const itemRefs = useRef({}); // { [value]: instancia de TouchableOpacity } — se llenan vía ref callback
  const hasPositionedRef = useRef(false);
  const highlightX = useRef(new Animated.Value(0)).current;
  const highlightWidth = useRef(new Animated.Value(0)).current;
  const [highlightReady, setHighlightReady] = useState(false);

  function syncHighlightTo(x, width) {
    if (!hasPositionedRef.current) {
      // Primera vez que se conoce una posición real — directo ahí, sin
      // animar (evita un slide-in raro desde la esquina al montar).
      highlightX.setValue(x);
      highlightWidth.setValue(width);
      hasPositionedRef.current = true;
      setHighlightReady(true);
      return;
    }

    Animated.parallel([
      Animated.spring(highlightX, { toValue: x, ...SPRING_CONFIG }),
      Animated.spring(highlightWidth, { toValue: width, ...SPRING_CONFIG }),
    ]).start();
  }

  // Reemplaza el diseño anterior (caché de onLayout por segmento + dos vías
  // que podían pisarse) por una sola vía que MIDE bajo demanda en vez de
  // esperar pasivamente un evento push. El bug real que motivó esto: con
  // flexGrow:1 en los tres segmentos, la suma de sus anchos base es siempre
  // constante (siempre "tres anchos base + un +48 del activo"), así que el
  // espacio sobrante que reparte flexGrow nunca cambia. Eso significa que,
  // yendo de Vacunas activo a Tratamientos activo, el ancho y la posición de
  // Historial (que no participa en ese swap) quedan matemáticamente
  // IDÉNTICOS — Vacunas pierde exactamente lo que Tratamientos gana. Como el
  // frame de Historial no cambió ni un píxel, RN correcta y legítimamente
  // NUNCA dispara un onLayout nuevo para él — no es un timing bug, onLayout
  // está haciendo exactamente lo que documenta (avisar sólo si el frame
  // cambió). El caché de Historial quedaba pegado a lo medido en el montaje
  // para siempre, hasta que ALGO más lo tocara. Medir on-demand con
  // measureLayout() evita depender de que RN decida avisar: se pregunta
  // directamente "¿dónde estás AHORA?" cada vez que cambia selectedValue, sin
  // importar si coincide numéricamente con un estado anterior.
  function measureAndSync() {
    const node = itemRefs.current[selectedValue];
    const trackNode = trackRef.current;
    if (!node || !trackNode) return;

    // measureLayout acepta el ref del componente host directo desde RN
    // 0.74 (ElementRef<HostComponent>) — findNodeHandle() ya no hace falta
    // para este caso, era el paso intermedio que pedían versiones viejas de
    // RN. Confirmado en node_modules/react-native/.../ReactNativeTypes.js
    // (measureLayout(relativeToNativeNode: number | ElementRef<...>, ...)).
    node.measureLayout(
      trackNode,
      (x, _y, width) => syncHighlightTo(x, width),
      () => {} // nodo recién desmontado u otra falla de medición — no hay nada que hacer
    );
  }

  useEffect(() => {
    // requestAnimationFrame, no medir en el mismo tick del commit — el
    // padding nuevo que este cambio de selectedValue le acaba de aplicar al
    // segmento activo (segItemActive) todavía puede no haber terminado de
    // reflejarse en el layout nativo en el instante en que corre este
    // efecto; esperar un frame le da tiempo real a Yoga antes de preguntar.
    const raf = requestAnimationFrame(measureAndSync);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValue]);

  const segments = options.map((opt) => (
    <Segment
      key={opt.value}
      ref={(node) => {
        itemRefs.current[opt.value] = node;
      }}
      option={opt}
      active={opt.value === selectedValue}
      onPress={() => onChange(opt.value)}
    />
  ));

  // El highlight es una capa aparte detrás de los segmentos — no un
  // background condicional en cada TouchableOpacity — así el layout de cada
  // segmento (flexBasis:'auto', ver comentario en segItem) sigue decidiendo
  // el ancho real sin que la animación lo toque; el highlight sólo se mueve
  // hacia la posición/ancho que measureLayout() acaba de confirmar, nunca al
  // revés.
  const highlight = highlightReady && (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.highlight,
        { transform: [{ translateX: highlightX }], width: highlightWidth },
      ]}
    />
  );

  // trackRef vive en una View plana propia, NO en la BlurView/View externa
  // (esa cambia de tipo según plataforma y expo-blur no garantiza un ref
  // medible con measureLayout) — así medir siempre pasa por el mismo tipo
  // de nodo pase lo que pase con el blur.
  const inner = (
    <View ref={trackRef} style={styles.trackInner}>
      {highlight}
      {segments}
    </View>
  );

  return Platform.OS === 'web' ? (
    <View style={[styles.segmented, webTrackBlurStyle, style]}>{inner}</View>
  ) : (
    <BlurView intensity={22} tint="light" style={[styles.segmented, style]}>
      {inner}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  segmented: {
    marginHorizontal: 18,
    marginTop: 16,
    marginBottom: 16,
    padding: 4,
    // Translúcido y sumado al blur (no en vez de él) — un color translúcido
    // solo, sin nada detrás desenfocándose, no lee como vidrio (mismo
    // diagnóstico que Login/Register: blurear un fondo parejo no se nota).
    backgroundColor: colors.sageTranslucent,
    borderRadius: 14,
    overflow: 'hidden', // recorta el blur nativo al radio del track (Android)
  },
  // View plana interna — ver comentario junto a trackRef arriba. Lleva el
  // flexDirection:'row' que antes vivía en `segmented`.
  trackInner: {
    flexDirection: 'row',
    flex: 1,
  },
  // flexGrow/flexShrink con flexBasis 'auto' (no el shorthand flex:1, que en
  // RN fuerza flexBasis:0% — todos los items arrancan en ancho 0 y crecen
  // parejo, ignorando cuánto contenido tienen). Con flexBasis 0%, el padding
  // extra del activo no ensancha su propia caja: el texto/fondo simplemente
  // se desborda visualmente sobre el vecino (overflow es 'visible' por
  // default en RN). Con flexBasis 'auto', cada item arranca del ancho de su
  // propio contenido (texto + padding) y flexGrow sólo reparte el espacio
  // sobrante — así el activo, sin importar su padding, nunca invade al de al
  // lado. El highlight animado de arriba sólo LEE la medición on-demand de
  // measureLayout(), nunca decide el layout — tocar este modelo reintroduciría
  // el bug de overlap.
  segItem: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segItemActive: {
    // Sin backgroundColor/shadow acá — los pinta el highlight animado.
    // Esto sólo controla el ANCHO real del item (para que flexBasis:'auto'
    // le dé más espacio), igual que antes.
    // 24 (no 0, heredado de segItem) — el texto quedaba pegado a la curva
    // del pill activo con etiquetas largas ("Tratamientos").
    paddingHorizontal: 24,
  },
  // Capa independiente detrás de los segmentos — incluye el fill negro y la
  // sombra que antes vivían en segItemActive. top/bottom:4 refleja el mismo
  // padding:4 del track, para el mismo inset vertical que tenía antes.
  highlight: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    backgroundColor: colors.ink,
    borderRadius: 14,
    ...shadow,
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  segItemText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
  },
});
