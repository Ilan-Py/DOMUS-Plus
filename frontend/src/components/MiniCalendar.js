import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';

// Mini calendario mensual (semana de lunes a domingo, como en Argentina).
// Marca con un puntito los días que tienen recordatorios y permite elegir un
// día para filtrar la agenda. No depende de ninguna librería.
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Color del punto según el tipo de recordatorio.
const COLOR_TIPO = {
  vacuna: colors.avatarAdultText,
  control: colors.sageDeep,
  medicacion: colors.limeDeep,
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

// Celda de un día: fondo suave al pasar el mouse (si no es el día elegido).
function DayCell({ fecha, tipos, esHoy, esSel, onPress }) {
  const [hover, setHover] = useState(false);
  const tiene = tipos.length > 0;
  return (
    <PressScale
      style={styles.cell}
      contentStyle={[
        styles.day,
        tiene && styles.dayMarked,
        hover && !esSel && styles.dayHover,
        esHoy && styles.dayToday,
        esSel && styles.daySelected,
      ]}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityLabel={`${fecha.getDate()} de ${MESES[fecha.getMonth()].toLowerCase()}${tiene ? ', con recordatorios' : ''}`}
      accessibilityState={{ selected: esSel }}
    >
      <Text style={[styles.dayText, esSel && styles.dayTextSelected]}>{fecha.getDate()}</Text>
      {/* Un punto por tipo de recordatorio del día (máx. 3), del color de su tipo. */}
      <View style={styles.dots}>
        {tipos.slice(0, 3).map((t) => (
          <View key={t} style={[styles.dot, { backgroundColor: esSel ? colors.onAccent : COLOR_TIPO[t] || colors.accentStrong }]} />
        ))}
      </View>
    </PressScale>
  );
}

export default function MiniCalendar({ mes, onCambiarMes, marcados, seleccionado, onElegirDia }) {
  const celdas = celdasDelMes(mes);
  const hoyKey = dayKey(new Date());
  const filas = [];
  for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7));

  return (
    <View>
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
            const tipos = marcados.get(key) || [];
            return (
              <DayCell
                key={j}
                fecha={fecha}
                tipos={tipos}
                esHoy={esHoy}
                esSel={esSel}
                onPress={() => onElegirDia(esSel ? null : key)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  nav: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: poppinsWeight('600'), color: colors.ink },
  row: { flexDirection: 'row' },
  dow: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
    paddingVertical: 6,
  },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  day: {
    width: '100%',
    height: '100%',
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayMarked: { backgroundColor: colors.dayTint },
  dayHover: { backgroundColor: colors.surfaceSoftPressed },
  dayToday: { borderWidth: 1.5, borderColor: colors.accentStrong },
  daySelected: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong,
    shadowColor: colors.accentStrong,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  dayText: { fontVariant: ['tabular-nums'], fontSize: 15, color: colors.ink },
  dayTextSelected: { color: colors.onAccent, fontFamily: poppinsWeight('600') },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
