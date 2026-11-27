import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonFilas } from './Skeleton';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { getList } from '../api/client';
import PressScale from './PressScale';
import InlineError from './InlineError';

// Resumen de la ficha de emergencia dentro del detalle de un integrante:
// grupo sanguíneo destacado, alergias como chips y contactos con teléfono
// visible (un toque llama). La edición vive en EmergencyScreen.
export default function EmergencySummary({ integrante, integranteId, onAbrirFicha }) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      setContactos(await getList(`/api/familia/integrantes/${integranteId}/contactos-emergencia`));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [integranteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const alergias = (integrante?.alergias || '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
  const sangre = integrante?.tipo_sangre;

  return (
    <View>
      <View style={styles.topRow}>
        {/* Rosa y rojo sólo cuando el dato existe: tiene que saltar a la vista en una
            emergencia. Sin dato, un fondo neutro con "Sin cargar". */}
        <View style={[styles.blood, !sangre && styles.bloodEmpty]}>
          <Text style={styles.bloodLabel}>Grupo sanguíneo</Text>
          {sangre ? (
            <Text style={styles.bloodValue}>{sangre}</Text>
          ) : (
            <Text style={styles.bloodNone}>Sin cargar</Text>
          )}
        </View>
        <View style={styles.allergies}>
          <Text style={styles.subLabel}>Alergias</Text>
          {alergias.length === 0 ? (
            <Text style={styles.none}>Sin alergias cargadas</Text>
          ) : (
            <View style={styles.chips}>
              {alergias.map((a) => (
                <View key={a} style={styles.chip}>
                  <Text style={styles.chipText}>{a}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.subLabel, styles.contactsLabel]}>Contactos de emergencia</Text>
      {loading ? (
        <SkeletonFilas filas={2} />
      ) : error ? (
        <InlineError message="No pudimos cargar los contactos de emergencia." onRetry={cargar} />
      ) : contactos.length === 0 ? (
        <Text style={styles.none}>Todavía no hay contactos cargados.</Text>
      ) : (
        contactos.map((c, i) => (
          <PressScale
            key={c.id}
            contentStyle={[styles.contact, i < contactos.length - 1 && styles.contactDivider]}
            onPress={() => Linking.openURL(`tel:${c.telefono}`)}
            accessibilityLabel={`Llamar a ${c.nombre}`}
          >
            <Ionicons name="call" size={24} color={colors.accentStrong} />
            <View style={styles.contactText}>
              <Text style={styles.contactName}>
                {c.nombre}
                {c.relacion ? <Text style={styles.contactMeta}>{`  ·  ${c.relacion}`}</Text> : null}
              </Text>
              {/* En una urgencia lo que importa es el teléfono: grande, con color de
                  acción y se toca para llamar (tel:). */}
              <Text style={styles.contactPhone}>{c.telefono}</Text>
            </View>
          </PressScale>
        ))
      )}

      <PressScale contentStyle={styles.openBtn} onPress={onAbrirFicha} accessibilityLabel="Ver y editar la ficha de emergencia">
        <Text style={styles.openText}>Ver y editar ficha</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.ink} />
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { gap: 16 },
  blood: {
    backgroundColor: colors.errorBg,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bloodEmpty: { backgroundColor: colors.badgeSand },
  bloodNone: { fontSize: 16, color: colors.textBody },
  bloodLabel: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  bloodValue: { fontSize: 28, lineHeight: 36, fontFamily: poppinsWeight('700'), color: colors.error },
  allergies: {},
  subLabel: { fontSize: 14, fontFamily: poppinsWeight('600'), color: colors.textBody, marginBottom: 8 },
  contactsLabel: { marginTop: 20 },
  none: { fontSize: 16, color: colors.textBody },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.badgeSand,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  chipText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.badgeSandText },
  loading: { alignSelf: 'flex-start', marginVertical: 8 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8 },
  contactDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderCard },
  contactText: { flex: 1 },
  contactName: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
  contactMeta: { fontSize: 15, fontFamily: poppinsWeight('400'), color: colors.textBody },
  contactPhone: { fontVariant: ['tabular-nums'],
    fontSize: 20,
    lineHeight: 28,
    fontFamily: poppinsWeight('600'),
    color: colors.accentStrong,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.glassStrong,
  },
  openText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
});
