import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import PressScale from './PressScale';

// Calendario mensual (semana de lunes a domingo, como en Argentina). Marca con puntos de color los
// días que tienen recordatorios (un punto por categoría) y permite elegir un día para ver su agenda.
// No depende de ninguna librería. Con `cabecera={false}` se dibuja sólo la grilla (el encabezado con
// mes, "Hoy" y flechas lo pone la pantalla).
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Color del punto según la categoría: medicación (terracota), mascota (salvia), turno o control (ocre).
export const COLOR_CATEGORIA = {
  medicacion: colors.accentStrong,
  mascota: colors.salvia,
  turno: colors.ocre,
};

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

// Celda de un día. Hoy: círculo terracota sólido con número blanco. Elegido: borde terracota de 2 px
// y fondo arena. Fondo suave al pasar el mouse.
function DayCell({ fecha, categorias, esHoy, esSel, onPress }) {
  const [hover, setHover] = useState(false);
  const tiene = categorias.length > 0;
  return (
    <PressScale
      style={styles.cell}
      contentStyle={[styles.day, hover && !esSel && styles.dayHover, esSel && styles.daySelected]}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityLabel={`${fecha.getDate()} de ${MESES[fecha.getMonth()].toLowerCase()}${esHoy ? ', hoy' : ''}${tiene ? ', con recordatorios' : ''}`}
      accessibilityState={{ selected: esSel }}
    >
      <View style={[styles.num, esHoy && styles.numHoy]}>
        <Text style={[styles.dayText, esHoy && styles.dayTextHoy, esSel && !esHoy && styles.dayTextSel]}>
          {fecha.getDate()}
        </Text>
      </View>
      {/* Un punto por categoría del día (máx. 3), del color de su categoría. */}
      <View style={styles.dots}>
        {categorias.slice(0, 3).map((c) => (
          <View key={c} style={[styles.dot, { backgroundColor: COLOR_CATEGORIA[c] || colors.accentStrong }]} />
        ))}
      </View>
    </PressScale>
  );
}

export default function MiniCalendar({ mes, onCambiarMes, marcados, seleccionado, onElegirDia, cabecera = true }) {
  const celdas = celdasDelMes(mes);
  const hoyKey = dayKey(new Date());
  const filas = [];
  for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7));

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

      <View style={styles.row}>
        {DIAS.map((d) => (
          <Text key={d} style={styles.dow}>
            {d}
          </Text>
        ))}
      </View>

      {filas.map((fila, i) => (
        <View key={i} style={styles.row}>
          {fila.map((fecha, j) => {
            if (!fecha) return <View key={j} style={styles.cell} />;
            const key = dayKey(fecha);
            const esSel = seleccionado === key;
            const esHoy = key === hoyKey;
            const categorias = marcados.get(key) || [];
            return (
              <DayCell
                key={j}
                fecha={fecha}
                categorias={categorias}
                esHoy={esHoy}
                esSel={esSel}
                onPress={() => onElegirDia(key)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

export const NOMBRE_MES = (i) => MESES[i];

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  nav: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: SERIF_BOLD, color: colors.ink },
  row: { flexDirection: 'row' },
  dow: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
    paddingVertical: 8,
  },
  cell: { flex: 1, aspectRatio: 1.45, minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 2 },
  day: {
    width: '100%',
    height: '100%',
    minHeight: 48,
    gap: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHover: { backgroundColor: colors.surfaceSoftPressed },
  daySelected: { backgroundColor: colors.arena, borderColor: colors.accentStrong },
  num: { minWidth: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  numHoy: { backgroundColor: colors.accentStrong },
  dayText: { fontVariant: ['tabular-nums'], fontSize: 17, color: colors.ink },
  dayTextHoy: { color: colors.onAccent, fontFamily: poppinsWeight('700') },
  dayTextSel: { fontFamily: poppinsWeight('700') },
  dots: { flexDirection: 'row', gap: 4, height: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
