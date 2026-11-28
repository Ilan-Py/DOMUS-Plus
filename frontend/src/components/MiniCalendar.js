import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import PressScale from './PressScale';

// Calendario mensual (semana de lunes a domingo, como en Argentina). Superficie limpia y plana: celdas sin
// relleno y con línea fina; el fondo sólo aparece al pasar el mouse, en hoy y en el día elegido. Los días del mes
// anterior y siguiente se ven atenuados y se pueden elegir; los pasados también van más tenues.
//   marcados: Map<dayKey, { eventos: [{ id, tipo, hora, titulo, hecho, vencido, serie }] }>
// Cada evento se dibuja como un punto del color de su tipo; en días pasados el punto cuenta la adherencia
// (✓ hecho · ✕ sin marcar). Con pantalla ancha (`ancha`) se muestran chips con hora y título.
// Nombres de mes desde Intl (es-AR) en vez de una lista fija.
const fmtMes = new Intl.DateTimeFormat('es-AR', { month: 'long' });
const MESES = Array.from({ length: 12 }, (_, i) => {
  const n = fmtMes.format(new Date(2024, i, 1));
  return n.charAt(0).toUpperCase() + n.slice(1);
});
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Tono pastel y borde sutil por tipo de aviso (medicación, vacuna, turno o control). `mascota` y `turno` se
// conservan para el resumen semanal de Familia.
export const TONO_CATEGORIA = {
  medicacion: { bg: '#FAECE7', borde: 'rgba(194, 70, 35, 0.35)', fg: '#C24623', texto: '#9A3416' },
  vacuna: { bg: '#E8F0EC', borde: 'rgba(74, 107, 93, 0.35)', fg: '#4A6B5D', texto: '#3B5A4C' },
  control: { bg: '#FDF3E1', borde: 'rgba(200, 141, 50, 0.35)', fg: '#C88D32', texto: '#7A5112' },
  mascota: { bg: '#E8F0EC', borde: 'rgba(74, 107, 93, 0.35)', fg: '#4A6B5D', texto: '#3B5A4C' },
  turno: { bg: '#FDF3E1', borde: 'rgba(200, 141, 50, 0.35)', fg: '#C88D32', texto: '#7A5112' },
};
const VACIO = { bg: '#FBF8F3', borde: 'rgba(42, 36, 33, 0.08)' };
const NOMBRE_TIPO = { medicacion: 'medicación', vacuna: 'vacuna', control: 'turno o control' };

export function dayKey(fecha) {
  return `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
}

// Celdas completas de las semanas que cubre el mes (con los días vecinos, sin huecos).
function celdasDelMes(mes) {
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const huecos = (primero.getDay() + 6) % 7; // lunes = 0
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const total = Math.ceil((huecos + dias) / 7) * 7;
  return Array.from({ length: total }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), 1 - huecos + i));
}

// Fondo de la carta: tono liso (0 o 1 categoría) o cortes diagonales a 135° sin difuminar (2 o 3).
export function FondoCategorias({ categorias }) {
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

// Indicador de un evento: punto del color del tipo (pendiente); ✓ si se hizo; ✕ si venció sin marcar.
function Marca({ ev }) {
  const t = TONO_CATEGORIA[ev.tipo] || TONO_CATEGORIA.control;
  if (ev.hecho) return <Ionicons name="checkmark-circle" size={14} color={colors.salvia} />;
  if (ev.vencido) return <Ionicons name="close-circle" size={14} color="#B5391C" />;
  return <View style={[styles.punto, { backgroundColor: t.fg }]} />;
}

function DayCell({ fecha, info, esHoy, esSel, fuera, pasado, onPress, onAgregar, alto, compacta, ancha }) {
  const [hover, setHover] = useState(false);
  const temporizador = useRef(null);
  const entrar = () => {
    clearTimeout(temporizador.current);
    setHover(true);
  };
  const salir = () => {
    temporizador.current = setTimeout(() => setHover(false), 80);
  };
  const eventos = info ? info.eventos : [];
  const total = eventos.length;
  const fondo = esSel ? '#FFFFFF' : hover ? '#F5EFE6' : esHoy ? '#FDF3EE' : 'transparent';
  const tenue = fuera ? 0.45 : pasado && !esHoy ? 0.62 : 1;
  const resumen = total
    ? `, ${total} ${total === 1 ? 'recordatorio' : 'recordatorios'} (${[...new Set(eventos.map((e) => NOMBRE_TIPO[e.tipo]))].join(', ')})`
    : ', sin recordatorios';
  const verChips = ancha && !compacta;

  return (
    <View style={styles.cell}>
      <PressScale
        style={styles.cellFill}
        contentStyle={[
          styles.carta,
          { minHeight: alto, backgroundColor: fondo },
          compacta && styles.cartaCompacta,
          esSel && styles.cartaSel,
        ]}
        onPress={onPress}
        onHoverIn={entrar}
        onHoverOut={salir}
        accessibilityLabel={`${fecha.getDate()} de ${MESES[fecha.getMonth()].toLowerCase()}${esHoy ? ', hoy' : ''}${resumen}`}
        accessibilityState={{ selected: esSel }}
      >
        <View style={{ flex: 1, gap: 6, opacity: tenue }}>
        <View style={styles.arriba}>
          <View style={[styles.num, esHoy && styles.numHoy]}>
            <Text style={[styles.dayText, esHoy && styles.dayTextHoy]}>{fecha.getDate()}</Text>
          </View>
        </View>
        {total > 0 && verChips && (
          <View style={styles.chips}>
            {eventos.slice(0, 2).map((e) => {
              const t = TONO_CATEGORIA[e.tipo] || TONO_CATEGORIA.control;
              return (
                <View key={e.id} style={[styles.chip, { backgroundColor: t.bg }]}>
                  {e.hecho ? (
                    <Ionicons name="checkmark" size={12} color={colors.salvia} />
                  ) : e.vencido ? (
                    <Ionicons name="close" size={12} color="#B5391C" />
                  ) : null}
                  <Text style={[styles.chipTexto, { color: t.texto }]} numberOfLines={1}>
                    {e.serie ? '↻ ' : ''}
                    {e.hora} {e.titulo}
                  </Text>
                </View>
              );
            })}
            {total > 2 && <Text style={styles.mas}>+{total - 2}</Text>}
          </View>
        )}
        {total > 0 && !verChips && (
          <View style={styles.puntos}>
            {eventos.slice(0, 2).map((e) => (
              <Marca key={e.id} ev={e} />
            ))}
            {total > 2 && <Text style={styles.mas}>+{total - 2}</Text>}
          </View>
        )}
        </View>
      </PressScale>
      {hover && !compacta && !!onAgregar && !pasado && (
        <PressScale
          style={styles.mas2}
          contentStyle={styles.masBtn}
          onPress={onAgregar}
          onHoverIn={entrar}
          onHoverOut={salir}
          accessibilityLabel={`Agregar un recordatorio el ${fecha.getDate()} de ${MESES[fecha.getMonth()].toLowerCase()}`}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </PressScale>
      )}
    </View>
  );
}

export default function MiniCalendar({
  mes, onCambiarMes, marcados, seleccionado, onElegirDia, onAgregar, cabecera = true, compacta = false, ancha = false,
}) {
  const celdas = celdasDelMes(mes);
  const hoy0 = new Date();
  hoy0.setHours(0, 0, 0, 0);
  const hoyKey = dayKey(new Date());
  const filas = [];
  for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7));
  const alto = compacta ? 56 : ancha ? 104 : 84;

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

      <View style={[styles.fila, styles.filaDias, compacta && styles.gapChico]}>
        {DIAS.map((d) => (
          <Text key={d} style={styles.dow}>
            {d}
          </Text>
        ))}
      </View>

      <View style={[styles.grilla, compacta && styles.gapChico]}>
        {filas.map((fila, i) => (
          <View key={i} style={[styles.fila, compacta && styles.gapChico]}>
            {fila.map((fecha) => {
              const key = dayKey(fecha);
              return (
                <DayCell
                  key={key}
                  fecha={fecha}
                  info={marcados.get(key)}
                  esHoy={key === hoyKey}
                  esSel={seleccionado === key}
                  fuera={fecha.getMonth() !== mes.getMonth()}
                  pasado={fecha < hoy0}
                  alto={alto}
                  compacta={compacta}
                  ancha={ancha}
                  onPress={() => onElegirDia(key, fecha)}
                  onAgregar={onAgregar ? () => onAgregar(key) : undefined}
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
  grilla: { gap: 4 },
  fila: { flexDirection: 'row', gap: 4 },
  filaDias: { marginBottom: 8 },
  gapChico: { gap: 2 },
  dow: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
  },
  cell: { flex: 1, minWidth: 0, position: 'relative' },
  cellFill: { flex: 1 },
  carta: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(42, 36, 33, 0.10)',
    padding: 8,
    gap: 6,
  },
  cartaCompacta: { padding: 4 },
  // Elegido: borde sólido de 2 px en tinta + sombra corta de cartulina.
  cartaSel: {
    borderWidth: 2,
    borderColor: '#2A2421',
    ...Platform.select({ web: { boxShadow: '0 3px 0 rgba(42, 36, 33, 0.10)' }, default: {} }),
  },
  arriba: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  num: { minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numHoy: { backgroundColor: colors.accentStrong },
  dayText: { fontVariant: ['tabular-nums'], fontSize: 17, fontFamily: poppinsWeight('600'), color: '#2A2421' },
  dayTextHoy: { color: colors.onAccent, fontFamily: poppinsWeight('700') },
  punto: { width: 10, height: 10, borderRadius: 5 },
  puntos: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  chips: { gap: 3 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  chipTexto: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontFamily: poppinsWeight('600') },
  mas: { fontSize: 12, lineHeight: 16, fontFamily: poppinsWeight('600'), color: colors.textBody },
  mas2: { position: 'absolute', top: 6, right: 6 },
  masBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentStrong, alignItems: 'center', justifyContent: 'center' },
});
