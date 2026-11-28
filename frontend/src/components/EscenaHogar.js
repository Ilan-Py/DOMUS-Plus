import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Rect, Circle, G, Ellipse } from 'react-native-svg';
import useReducedMotion from '../hooks/useReducedMotion';
import { MANUSCRITA, poppinsWeight } from '../theme/typography';

// Escena de papel recortado para la landing y las pantallas de entrada (no fotos de stock).
// Capas, de atrás hacia adelante: cielo (sol de día, luna de noche) → loma mostaza → loma salvia → casita →
// familia y perro → pasto y plantas. Cada capa tiene su sombra dura corrida (papel apilado).
// Entrada: las capas se deslizan y se asientan una por una (500 ms, escalonadas). Parallax leve con el mouse (web).
// Con «reducir movimiento» aparece quieta.
//
//   <EscenaHogar variante="login" | "registro" | "codigo" | "landing" carta={{ titulo, texto }} />
//     login: luz de la ventana prendida · registro: puerta abriéndose · codigo: puerta con felpudo «Bienvenida»
const ANCHO = 1000;
const ALTO = 800;
const SOMBRA = '#00000022';

function esDeNoche(fecha = new Date()) {
  const h = fecha.getHours();
  return h >= 20 || h < 7;
}

// Dibuja una forma dos veces: la sombra dura (corrida 6 × 8) y el papel.
function ConSombra({ d, fill, dx = 6, dy = 8 }) {
  return (
    <>
      <Path d={d} fill={SOMBRA} transform={`translate(${dx} ${dy})`} />
      <Path d={d} fill={fill} />
    </>
  );
}

function Cielo({ noche }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMax slice">
      <Rect x={0} y={0} width={ANCHO} height={ALTO} fill={noche ? '#3B4A5C' : '#F6EDE2'} />
      {noche ? (
        <>
          <Circle cx={790} cy={150} r={46} fill="#00000033" transform="translate(5 7)" />
          <Circle cx={790} cy={150} r={46} fill="#F4E7C6" />
          <Circle cx={808} cy={138} r={42} fill="#3B4A5C" />
          {[[160, 120], [300, 70], [430, 160], [620, 90], [900, 260], [120, 260]].map(([x, y]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill="#F4E7C6" />
          ))}
        </>
      ) : (
        <>
          <Circle cx={780} cy={160} r={58} fill={SOMBRA} transform="translate(6 8)" />
          <Circle cx={780} cy={160} r={58} fill="#E8B04B" />
          <Path d="M150 170 C170 140 220 140 236 166 C262 160 280 182 268 200 L140 200 C120 196 126 172 150 170 Z" fill="#FFFDF9" opacity={0.9} />
        </>
      )}
    </Svg>
  );
}

function LomaAtras({ noche }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMax slice">
      <ConSombra
        d="M0 470 L40 456 L70 466 C200 380 330 360 470 420 C600 474 720 380 860 372 L900 384 L940 370 L1000 380 L1000 800 L0 800 Z"
        fill={noche ? '#8E7A4A' : '#E7C77A'}
      />
    </Svg>
  );
}

function LomaAdelante({ noche }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMax slice">
      <ConSombra
        d="M0 560 C140 500 280 520 380 552 L420 544 L450 556 C600 590 760 520 1000 510 L1000 800 L0 800 Z"
        fill={noche ? '#5E7A6B' : '#9DB8A6'}
      />
    </Svg>
  );
}

// Casita terracota. Puerta: cerrada, entreabierta (registro) o con felpudo (código). Ventana prendida en login y de noche.
function Casita({ variante, noche }) {
  const luz = variante === 'login' || noche;
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMax slice">
      <G>
        <Rect x={386} y={420} width={228} height={180} rx={6} fill={SOMBRA} transform="translate(8 10)" />
        <Rect x={386} y={420} width={228} height={180} rx={6} fill="#FFFDF9" />
        <Path d="M360 432 L500 312 L640 432 Z" fill={SOMBRA} transform="translate(8 10)" />
        <Path d="M360 432 L500 312 L640 432 Z" fill="#C24623" />
        <Rect x={556} y={340} width={30} height={60} rx={3} fill="#A9441F" />
        {/* ventana */}
        <Rect x={410} y={460} width={62} height={56} rx={6} fill={luz ? '#F7D774' : '#DCE7E0'} />
        {luz && <Rect x={404} y={454} width={74} height={68} rx={10} fill="#F7D77455" />}
        <Rect x={439} y={460} width={4} height={56} fill="#FFFDF9" />
        <Rect x={410} y={486} width={62} height={4} fill="#FFFDF9" />
        {/* puerta */}
        {variante === 'registro' ? (
          <>
            <Rect x={510} y={480} width={64} height={120} rx={8} fill="#2F3B33" />
            <Path d="M510 480 L540 488 L540 606 L510 600 Z" fill="#4A6B5D" />
          </>
        ) : (
          <Rect x={510} y={480} width={64} height={120} rx={32} fill="#4A6B5D" />
        )}
        <Circle cx={562} cy={545} r={4} fill="#E8B04B" />
        {variante === 'codigo' && (
          <>
            <Rect x={488} y={600} width={108} height={22} rx={4} fill={SOMBRA} transform="translate(4 5)" />
            <Rect x={488} y={600} width={108} height={22} rx={4} fill="#C9A27E" />
          </>
        )}
      </G>
    </Svg>
  );
}

// Familia y perro como siluetas recortadas (mismo lenguaje que el logo).
function Familia() {
  const persona = (x, s, ropa) => (
    <G key={x} transform={`translate(${x} 0) scale(${s})`}>
      <Path d="M-28 640 C-28 600 28 600 28 640 Z" fill={SOMBRA} transform="translate(5 6)" />
      <Path d="M-28 640 C-28 600 28 600 28 640 Z" fill={ropa} />
      <Circle cx={0} cy={584} r={18} fill={SOMBRA} transform="translate(5 6)" />
      <Circle cx={0} cy={584} r={18} fill="#E9C6A8" />
    </G>
  );
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMax slice">
      <G transform="translate(0 30)">
        {persona(300, 1, '#C24623')}
        {persona(345, 1.15, '#4A6B5D')}
        {persona(660, 0.8, '#E8B04B')}
        {persona(705, 1.05, '#9B87C4')}
        {/* perro */}
        <G transform="translate(-70 0)">
        <Ellipse cx={826} cy={622} rx={30} ry={18} fill={SOMBRA} transform="translate(5 6)" />
        <Ellipse cx={826} cy={622} rx={30} ry={18} fill="#B98A5E" />
        <Circle cx={856} cy={604} r={14} fill="#B98A5E" />
        <Ellipse cx={864} cy={596} rx={5} ry={9} fill="#8C6440" />
        <Circle cx={860} cy={603} r={2.5} fill="#2A2421" />
        <Path d="M796 616 C786 606 784 598 790 594" stroke="#B98A5E" strokeWidth={6} strokeLinecap="round" fill="none" />
        </G>
      </G>
    </Svg>
  );
}

function Pasto({ noche }) {
  const verde = noche ? '#44604F' : '#6E9A7E';
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMax slice">
      <ConSombra
        d="M0 690 L30 676 L52 690 L80 672 L104 690 L140 678 L170 692 C320 668 470 700 640 680 L670 668 L700 684 L740 670 L780 686 C860 674 940 690 1000 680 L1000 800 L0 800 Z"
        fill={verde}
      />
      {/* plantas */}
      {[[90, 660], [168, 670], [880, 652], [940, 664]].map(([x, y]) => (
        <G key={x}>
          <Path d={`M${x} ${y + 30} C${x - 18} ${y} ${x - 6} ${y - 24} ${x} ${y - 30} C${x + 6} ${y - 24} ${x + 18} ${y} ${x} ${y + 30} Z`} fill={noche ? '#5E7A6B' : '#4A6B5D'} />
          <Circle cx={x + 16} cy={y - 8} r={7} fill={noche ? '#C9A6A0' : '#E8A598'} />
        </G>
      ))}
    </Svg>
  );
}

const CAPAS = [Cielo, LomaAtras, LomaAdelante, Casita, Familia, Pasto];
const PROFUNDIDAD = [0, 4, 7, 10, 13, 16]; // px de parallax por capa

export default function EscenaHogar({ variante = 'landing', carta, style, alto }) {
  const reducir = useReducedMotion();
  const noche = esDeNoche();
  const entradas = useRef(CAPAS.map(() => new Animated.Value(reducir ? 1 : 0))).current;
  const px = useRef(new Animated.Value(0)).current;
  const py = useRef(new Animated.Value(0)).current;
  const [caja, setCaja] = useState(null);

  useEffect(() => {
    if (reducir) {
      entradas.forEach((v) => v.setValue(1));
      return;
    }
    Animated.stagger(
      110,
      entradas.map((v) => Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }))
    ).start();
  }, [entradas, reducir]);

  // Parallax muy leve con el mouse (sólo web y sin «reducir movimiento»).
  const mover = (ev) => {
    if (reducir || !caja || Platform.OS !== 'web') return;
    const { locationX, locationY } = ev.nativeEvent;
    px.setValue((locationX / caja.width - 0.5) * 2);
    py.setValue((locationY / caja.height - 0.5) * 2);
  };

  // Posición de la puerta en píxeles (la escena se escala con «slice», centrada abajo).
  let cartaPos = null;
  if (caja && carta) {
    const escala = Math.max(caja.width / ANCHO, caja.height / ALTO);
    const x = caja.width / 2 + (542 - ANCHO / 2) * escala;
    const y = caja.height - (ALTO - 470) * escala;
    cartaPos = { left: x + 46 * escala, top: y - 4 * escala };
  }

  return (
    <View
      style={[styles.raiz, alto ? { height: alto } : null, style]}
      onLayout={(e) => setCaja(e.nativeEvent.layout)}
      {...(Platform.OS === 'web' ? { onMouseMove: mover, onMouseLeave: () => { px.setValue(0); py.setValue(0); } } : null)}
      accessibilityRole="image"
      accessibilityLabel={
        variante === 'registro'
          ? 'Ilustración de papel: una casita con la puerta abriéndose y la familia con su perro afuera'
          : variante === 'codigo'
            ? 'Ilustración de papel: una casita con un felpudo de bienvenida en la puerta'
            : 'Ilustración de papel: una casita con la luz prendida, la familia y su perro'
      }
    >
      {CAPAS.map((Capa, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: entradas[i],
              transform: [
                { translateY: entradas[i].interpolate({ inputRange: [0, 1], outputRange: [i === 0 ? 0 : 40, 0] }) },
                { translateX: Animated.multiply(px, -PROFUNDIDAD[i]) },
                { translateY: Animated.multiply(py, -PROFUNDIDAD[i] / 2) },
              ],
            },
          ]}
        >
          <Capa variante={variante} noche={noche} />
        </Animated.View>
      ))}
      {!!cartaPos && (
        <Animated.View
          pointerEvents="none"
          style={[styles.carta, { left: cartaPos.left, top: cartaPos.top, opacity: entradas[CAPAS.length - 1] }]}
        >
          <View style={styles.cartaCinta} />
          <Text style={styles.cartaTitulo}>{carta.titulo}</Text>
          <Text style={styles.cartaTexto}>{carta.texto}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { position: 'relative', overflow: 'hidden', width: '100%', height: '100%' },
  carta: {
    position: 'absolute',
    width: 210,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFDF9',
    borderRadius: 4,
    transform: [{ rotate: '-3deg' }],
    ...Platform.select({
      web: { boxShadow: '4px 5px 0 rgba(42,36,33,0.18)' },
      default: { shadowColor: '#2A2421', shadowOffset: { width: 4, height: 5 }, shadowOpacity: 0.18, shadowRadius: 0, elevation: 3 },
    }),
  },
  cartaCinta: { position: 'absolute', top: -9, left: 70, width: 64, height: 18, backgroundColor: 'rgba(233, 198, 181, 0.9)', transform: [{ rotate: '4deg' }] },
  cartaTitulo: { fontSize: 16, lineHeight: 21, fontFamily: poppinsWeight('700'), color: '#2A2421' },
  cartaTexto: { fontFamily: MANUSCRITA, fontSize: 21, lineHeight: 24, color: '#8E3A2A', marginTop: 2 },
});
