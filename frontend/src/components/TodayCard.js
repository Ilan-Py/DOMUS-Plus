import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SkeletonFilas } from './Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { colors, reminderBadge } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { getList } from '../api/client';
import { parseFechaHora } from '../utils/displayFormat';
import { useFamily } from '../context/FamilyContext';
import PaperCutout from './PaperCutout';
import PressScale from './PressScale';

// «Hoy en tu familia»: los próximos recordatorios de hoy (y los vencidos que
// siguen pendientes), hasta 3, con hora, categoría, descripción y de quién es.
// Marcar un recordatorio como hecho se hace desde el Calendario.
const MAX_ITEMS = 3;
const TIPO_LABELS = { vacuna: 'Vacuna', control: 'Control', medicacion: 'Medicación' };
const formatoDia = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const formatoHora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

function finDeHoy() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function TodayCard({ onVerCalendario }) {
  const [items, setItems] = useState(null); // null = cargando
  const [error, setError] = useState(false);
  const { integrantes, mascotas } = useFamily();

  const cargar = useCallback(async () => {
    try {
      const datos = await getList('/api/recordatorios');
      const limite = finDeHoy();
      setItems(
        datos
          .filter((r) => r.activo)
          .map((r) => ({ ...r, fecha: parseFechaHora(r.fecha_hora) }))
          .filter((r) => r.fecha && !Number.isNaN(r.fecha.getTime()) && r.fecha <= limite)
          .sort((a, b) => a.fecha - b.fecha)
      );
      setError(false);
    } catch {
      setError(true);
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  function paraQuien(r) {
    if (r.integrante_id) return integrantes.find((m) => m.id === r.integrante_id)?.nombre;
    if (r.mascota_id) return mascotas.find((m) => m.id === r.mascota_id)?.nombre;
    return '';
  }

  if (items === null) {
    return (
      <View style={styles.card}>
        <SkeletonFilas filas={2} />
      </View>
    );
  }

  const ahora = new Date();
  const visibles = items.slice(0, MAX_ITEMS);

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        Hoy en tu familia
      </Text>

      {visibles.length === 0 ? (
        <View style={styles.empty}>
          {/* Solcito de papel (ocre), apenas girado, que se eleva un poco al pasar el mouse */}
          {!error && <PaperCutout icon="sun" tinte="ocre" size={104} rotate={-2} hover />}
          <Text style={[styles.emptyTitle, !error && { color: colors.salvia }]}>{error ? 'No pudimos cargar los pendientes' : '¡Todo al día!'}</Text>
          <Text style={styles.emptyText}>
            {error ? 'Revisá tu conexión e intentá de nuevo.' : 'No hay pendientes para hoy.'}
          </Text>
        </View>
      ) : (
        visibles.map((r, i) => {
          const vencido = r.fecha < ahora;
          const mismoDia = r.fecha.toDateString() === ahora.toDateString();
          const hora = formatoHora.format(r.fecha);
          const cuando = mismoDia ? hora : `${formatoDia.format(r.fecha)} · ${hora}`;
          const dueno = paraQuien(r);
          const colorTipo = (reminderBadge[r.tipo] ?? reminderBadge.control).text;
          return (
            <View key={r.id} style={[styles.row, i < visibles.length - 1 && styles.rowDivider]}>
              <View style={styles.meta}>
                <Text style={styles.hora}>{cuando}</Text>
                <View style={[styles.dot, { backgroundColor: colorTipo }]} />
                <Text style={styles.tipo}>{TIPO_LABELS[r.tipo] ?? r.tipo}</Text>
                {vencido && <Text style={styles.vencido}>· Vencido</Text>}
              </View>
              <Text style={styles.desc} numberOfLines={2}>
                {r.descripcion || 'Recordatorio'}
              </Text>
              {!!dueno && <Text style={styles.dueno}>{dueno}</Text>}
            </View>
          );
        })
      )}

      <PressScale contentStyle={styles.link} onPress={onVerCalendario} accessibilityLabel="Ver calendario">
        <Text style={styles.linkText}>Ver calendario</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.accentStrong} />
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 0,
  },
  loading: { alignSelf: 'center', marginVertical: 24 },
  title: { fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink, marginBottom: 12 },

  row: { paddingVertical: 12, gap: 4 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#EFE8DF' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  hora: { fontVariant: ['tabular-nums'], fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tipo: { fontSize: 15, color: colors.textBody },
  vencido: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.limeDeep },
  desc: { fontSize: 16, lineHeight: 22, color: colors.textBody },
  dueno: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.iconWarm },

  empty: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  emptyTitle: { fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink, textAlign: 'center', marginTop: 8 },
  emptyText: { fontSize: 16, lineHeight: 22, color: colors.textEmpty, textAlign: 'center' },

  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFE8DF',
  },
  linkText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.accentStrong },
});
