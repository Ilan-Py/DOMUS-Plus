import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from '../components/PressScale';

// Compartido por AddVaccineScreen, AddTreatmentScreen y AddReminderScreen —
// mismo topbar (idéntico al de AddMemberScreen, aunque ese no reusa este
// componente todavía) y misma regla de clave de dueño que /api/salud/*
// espera: exactamente integrante_id O mascota_id, nunca ambas.

export function ownerField(ownerTipo, ownerId) {
  return ownerTipo === 'integrante' ? { integrante_id: ownerId } : { mascota_id: ownerId };
}

export function HealthFormTopbar({ navigation, title }) {
  return (
    <View style={styles.topbar}>
      <PressScale
        contentStyle={styles.backBtn}
        onPress={() => navigation.goBack()}
        accessibilityLabel="Volver"
      >
        <Text style={styles.backBtnIcon}>‹</Text>
      </PressScale>
      <Text style={styles.topbarTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 16,
    // bgBase (no colors.glass, que ahora es blanco puro) — mismo criterio
    // que el resto de los headers, ver FamilyListScreen.js.
    backgroundColor: colors.bgBase,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  backBtnIcon: {
    fontSize: 22,
    color: colors.navy,
  },
  topbarTitle: {
    fontSize: 19,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
});
