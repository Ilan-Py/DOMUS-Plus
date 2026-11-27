import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import PressScale from './PressScale';

// Calendario mensual (semana de lunes a domingo, como en Argentina) hecho de cartas de día: cada día con
// recordatorios se pinta entero con el tono pastel de su categoría (o con cortes diagonales nítidos si tiene
// 2 o 3 categorías). Elegir un día muestra su agenda. No depende de ninguna librería. Con `cabecera={false}`
// se dibuja sólo la grilla (el encabezado con mes, "Hoy" y flechas lo pone la pantalla).
//   marcados: Map<dayKey, { categorias: string[], total: number, titulo: string }>
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Tono pastel y borde sutil por categoría: medicación (terracota), mascota (salvia), turno o control (ocre).
export const TONO_CATEGORIA = {
  medicacion: { bg: '#FAECE7', borde: 'rgba(194, 70, 35, 0.35)' },
  mascota: { bg: '#E8F0EC', borde: 'rgba(74, 107, 93, 0.35)' },
  turno: { bg: '#FDF3E1', borde: 'rgba(200, 141, 50, 0.35)' },
};
const VACIO = { bg: '#FBF8F3', borde: 'rgba(42, 36, 33, 0.08)' };

export function dayKey(fecha) {
  return `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
}

// Celdas del mes: null para los huecos antes del día 1.
function celdasDelMes(mes) {
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const huecos = (primero.getDay() + 6) % 7; // lunes = 0
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celdas = Array(huecos).fill(null);
  for (let d = 1; d <= dias; d++) celdas.push(new Date(mes.getFullYear(), mes.getMonth(), d));
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

// Fondo de la carta: tono liso (0 o 1 categoría) o cortes diagonales a 135° sin difuminar (2 o 3).
function FondoCategorias({ categorias }) {
  const t = categorias.slice(0, 3).map((c) => (TONO_CATEGORIA[c] || VACIO).bg);
  if (t.length < 2) return null;
  const poligonos =
    t.length === 2
      ? [
          { pts: '0,0 100,0 0,100', fill: t[0] },
          { pts: '100,0 100,100 0,100', fill: t[1] },
        ]
      : [
          { pts: '0,0 66.7,0 0,66.7', fill: t[0] },
          { pts: '66.7,0 100,0 100,33.3 33.3,100 0,100 0,66.7', fill: t[1] },
          { pts: '100,33.3 100,100 33.3,100', fill: t[2] },
        ];
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {poligonos.map((p) => (
        <Polygon key={p.pts} points={p.pts} fill={p.fill} />
      ))}
    </Svg>
  );
}

// Carta de un día. Hoy: círculo terracota con número blanco (sin tapar el fondo de categoría). Elegido: borde
// sólido de 2 px en tinta y sombra corta de cartulina. Día vacío: fondo casi blanco con hover suave.
function DayCell({ fecha, info, esHoy, esSel, onPress, alto, compacta }) {
  const [hover, setHover] = useState(false);
  const categorias = info ? info.categorias : [];
  const total = info ? info.total : 0;
  const tono = TONO_CATEGORIA[categorias[0]] || VACIO;
  const fondo = categorias.length === 0 ? (hover ? '#F5EFE6' : VACIO.bg) : tono.bg;
  const borde = categorias.length === 0 ? VACIO.borde : categorias.length === 1 ? tono.borde : 'rgba(42, 36, 33, 0.18)';
  const abajo = total === 0 ? '' : total === 1 ? info.titulo : `${total} avisos`;

  return (
    <PressScale
      style={styles.cell}
      contentStyle={[
        styles.carta,
        { minHeight: alto, backgroundColor: fondo, borderColor: borde },
        esSel && styles.cartaSel,
      ]}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityLabel={`${fecha.getDate()} de ${MESES[fecha.getMonth()].toLowerCase()}${esHoy ? ', hoy' : ''}${
        total ? `, ${total} ${total === 1 ? 'recordatorio' : 'recordatorios'}` : ''
      }`}
      accessibilityState={{ selected: esSel }}
    >
      <FondoCategorias categorias={categorias} />
      <View style={styles.arriba}>
        <View style={[styles.num, esHoy && styles.numHoy]}>
          <Text style={[styles.dayText, esHoy && styles.dayTextHoy]}>{fecha.getDate()}</Text>
        </View>
        {total >= 2 && (
          <View style={styles.contador}>
            <Text style={styles.contadorText}>{total}</Text>
          </View>
        )}
      </View>
      {!compacta && !!abajo && (
        <Text style={styles.abajo} numberOfLines={1}>
          {abajo}
        </Text>
      )}
    </PressScale>
  );
}

export default function MiniCalendar({
  mes, onCambiarMes, marcados, seleccionado, onElegirDia, cabecera = true, compacta = false,
}) {
  const celdas = celdasDelMes(mes);
  const hoyKey = dayKey(new Date());
  const filas = [];
  for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7));
  const alto = compacta ? 56 : 84;

  return (
    <View>
      {cabecera && (
        <View style={styles.head}>
          <PressScale
            contentStyle={styles.nav}
            onPress={() => onCambiarMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
            accessibilityLabel="Mes anterior"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </PressScale>
          <Text style={styles.title} accessibilityRole="header">
            {MESES[mes.getMonth()]} {mes.getFullYear()}
          </Text>
          <PressScale
            contentStyle={styles.nav}
            onPress={() => onCambiarMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
            accessibilityLabel="Mes siguiente"
          >
            <Ionicons name="chevron-forward" size={22} color={colors.ink} />
          </PressScale>
        </View>
      )}

      <View style={[styles.fila, styles.filaDias]}>
        {DIAS.map((d) => (
          <Text key={d} style={styles.dow}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grilla}>
        {filas.map((fila, i) => (
          <View key={i} style={styles.fila}>
            {fila.map((fecha, j) => {
              if (!fecha) return <View key={j} style={styles.cell} />;
              const key = dayKey(fecha);
              return (
                <DayCell
                  key={j}
                  fecha={fecha}
                  info={marcados.get(key)}
                  esHoy={key === hoyKey}
                  esSel={seleccionado === key}
                  alto={alto}
                  compacta={compacta}
                  onPress={() => onElegirDia(key)}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export const NOMBRE_MES = (i) => MESES[i];

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  nav: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: SERIF_BOLD, color: colors.ink },
  grilla: { gap: 8 },
  fila: { flexDirection: 'row', gap: 8 },
  filaDias: { marginBottom: 8 },
  dow: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
  },
  cell: { flex: 1, minWidth: 0 },
  carta: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  // Elegido: borde sólido de 2 px en tinta + sombra corta de cartulina.
  cartaSel: {
    borderWidth: 2,
    borderColor: '#2A2421',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 2,
    ...Platform.select({ web: { boxShadow: '0 3px 0 rgba(42, 36, 33, 0.10)' }, default: {} }),
  },
  arriba: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  num: { minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numHoy: { backgroundColor: colors.accentStrong },
  dayText: { fontVariant: ['tabular-nums'], fontSize: 17, fontFamily: poppinsWeight('600'), color: '#2A2421' },
  dayTextHoy: { color: colors.onAccent, fontFamily: poppinsWeight('700') },
  contador: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: '#2A2421',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorText: { fontSize: 12, lineHeight: 16, fontFamily: poppinsWeight('700'), color: '#FFFFFF' },
  abajo: { fontSize: 13, lineHeight: 18, color: '#2A2421' },
});
