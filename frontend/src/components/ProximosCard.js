import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { paper } from '../theme/paper';
import { getList } from '../api/client';
import { parseFechaHora } from '../utils/displayFormat';
import { useFamily } from '../context/FamilyContext';
import { SkeletonFilas } from './Skeleton';
import PressScale from './PressScale';
import PrimaryButton from './PrimaryButton';

// «Próximos 7 días»: los siguientes recordatorios pendientes a partir de mañana (hasta 3). Si no hay
// ninguno, un botón rápido para programar un aviso. Lo de hoy vive en «Hoy en tu familia».
const MAX_ITEMS = 3;
const formatoDia = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
const formatoHora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

function ventana() {
  const desde = new Date();
  desde.setDate(desde.getDate() + 1);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + 7);
  hasta.setHours(23, 59, 59, 999);
  return { desde, hasta };
}

export default function ProximosCard({ onVerCalendario, onProgramar }) {
  const [items, setItems] = useState(null); // null = cargando
  const [error, setError] = useState(false);
  const { integrantes, mascotas } = useFamily();

  const cargar = useCallback(async () => {
    try {
      const datos = await getList('/api/recordatorios');
      const { desde, hasta } = ventana();
      setItems(
        datos
          .filter((r) => r.activo)
          .map((r) => ({ ...r, fecha: parseFechaHora(r.fecha_hora) }))
          .filter((r) => r.fecha && !Number.isNaN(r.fecha.getTime()) && r.fecha >= desde && r.fecha <= hasta)
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

  const visibles = (items || []).slice(0, MAX_ITEMS);

  return (
    <View {...paper('cutout')} style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">Próximos 7 días</Text>

      {items === null ? (
        <SkeletonFilas filas={2} />
      ) : visibles.length === 0 ? (
        <View style={styles.vacio}>
          <Ionicons name="calendar-outline" size={28} color={colors.ocre} />
          <Text style={styles.vacioText}>
            {error ? 'No pudimos cargar los avisos. Revisá tu conexión.' : 'No hay avisos para los próximos 7 días.'}
          </Text>
          {!error && !!onProgramar && (
            <PrimaryButton title="+ Programar aviso" variant="accent" fullWidth={false} onPress={onProgramar} />
          )}
        </View>
      ) : (
        <>
          {visibles.map((r, i) => {
            const dueno = paraQuien(r);
            return (
              <View key={r.id} style={[styles.row, i < visibles.length - 1 && styles.rowDivider]}>
                <Text style={styles.cuando}>
                  {formatoDia.format(r.fecha)} · {formatoHora.format(r.fecha)}
                </Text>
                <Text style={styles.desc} numberOfLines={2}>{r.descripcion || 'Recordatorio'}</Text>
                {!!dueno && <Text style={styles.dueno}>{dueno}</Text>}
              </View>
            );
          })}
          <PressScale contentStyle={styles.link} onPress={onVerCalendario} accessibilityLabel="Ver calendario">
            <Text style={styles.linkText}>Ver calendario</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.accentStrong} />
          </PressScale>
        </>
      )}
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 0,
    elevation: 2,
  },
  title: { fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink, marginBottom: 12 },
  row: { paddingVertical: 12, gap: 4 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#EFE8DF' },
  cuando: { fontVariant: ['tabular-nums'], fontSize: 15, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.ink, textTransform: 'capitalize' },
  desc: { fontSize: 16, lineHeight: 22, color: colors.textBody },
  dueno: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.iconWarm },
  vacio: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  vacioText: { fontSize: 16, lineHeight: 24, color: colors.textBody, textAlign: 'center' },
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
