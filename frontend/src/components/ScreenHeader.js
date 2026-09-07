import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { layout } from '../theme/spacing';
import PressScale from './PressScale';

// Unifica el topbar hand-copiado en 6 screens (FamilyListScreen, AccountScreen,
// CalendarScreen, AddMemberScreen, healthFormShared, ProfileDetailScreen) —
// paddingTop:54/paddingHorizontal:18/paddingBottom:16 + bgBase + hairline
// inferior, repetido idéntico en los 6. LoginScreen/RegisterScreen/
// GroupSetupScreen usan el mismo `54` pero sobre authWrap (form centrado, sin
// back/título/hairline) — no son este componente, ver layout.screenTopPadding
// en theme/colors.js para esa reutilización puntual del número.
//
// Dos formas según haya `onBack` o no: sin onBack (tab raíz: Familia/
// Calendario/Cuenta) el título+subtítulo apilan en columna; con onBack (stack:
// AddMember/AddVaccine/AddTreatment/AddReminder/ProfileDetail) el botón de
// volver los empuja a una fila. `rightActions` es JSX arbitrario del caller
// (los íconos lápiz/tacho de ProfileDetailScreen) — no se generaliza más
// porque es el único consumidor con acciones a la derecha.
//
// `subtitleStyle` default reproduce el subtítulo de FamilyListScreen/
// CalendarScreen (12px, textMuted, SIN fontFamily/fontWeight — o sea fuente
// del sistema, no Poppins). ProfileDetailScreen ya usaba un subtítulo
// distinto (12.5px/400/Poppins/textMutedLight) antes de esta migración — esa
// diferencia es preexistente (drift entre copias hand-rolled, no introducido
// acá) y se preserva pasando su propio subtitleStyle en vez de unificarse
// silenciosamente.
export default function ScreenHeader({ title, subtitle, subtitleStyle, onBack, rightActions, style }) {
  if (!onBack) {
    return (
      <View style={[styles.topbar, style]}>
        <Text style={styles.topbarTitle}>{title}</Text>
        {!!subtitle && <Text style={[styles.topbarSubt, subtitleStyle]}>{subtitle}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.topbar, styles.topbarRow, style]}>
      <PressScale
        contentStyle={styles.backBtn}
        onPress={onBack}
        hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
        accessibilityLabel="Volver"
      >
        <Text style={styles.backBtnIcon}>‹</Text>
      </PressScale>
      <View style={styles.topbarTextWrap}>
        <Text style={styles.topbarTitle}>{title}</Text>
        {!!subtitle && <Text style={[styles.topbarSubt, subtitleStyle]}>{subtitle}</Text>}
      </View>
      {rightActions}
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    paddingTop: layout.screenTopPadding,
    paddingHorizontal: 18,
    paddingBottom: 16,
    // bgBase (no colors.glass, que ahora es blanco puro) — el header debe
    // leerse como parte de la página crema, no como blanco sin estilo. La
    // separación visual la da el hairline de abajo, no un cambio de tono.
    backgroundColor: colors.bgBase,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  topbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  topbarTextWrap: {
    flex: 1,
  },
  topbarTitle: {
    fontSize: 19,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
  topbarSubt: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
});
