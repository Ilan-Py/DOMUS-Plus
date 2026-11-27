import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { layout } from '../theme/spacing';
import PressScale from './PressScale';
import useColumnInset from '../hooks/useColumnInset';

// Unifica el topbar hand-copiado en 6 screens (FamilyListScreen, AccountScreen,
// CalendarScreen, AddMemberScreen, healthFormShared, ProfileDetailScreen) —
// paddingTop:56/paddingHorizontal:20/paddingBottom:16 + bgBase + hairline
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
  const inset = useColumnInset();
  const insetStyle = { paddingHorizontal: 20 + inset };
  const divider = <View style={[styles.divider, { left: 18 + inset, right: 18 + inset }]} />;
  if (!onBack) {
    return (
      <View style={[styles.topbar, !!rightActions && styles.topbarRoot, insetStyle, style]}>
        <View style={styles.topbarTextWrap}>
          <Text style={styles.topbarTitle}>{title}</Text>
          {!!subtitle && <Text style={[styles.topbarSubt, subtitleStyle]}>{subtitle}</Text>}
        </View>
        {rightActions}
        {divider}
      </View>
    );
  }

  return (
    <View style={[styles.topbar, styles.topbarRow, insetStyle, style]}>
      <PressScale
        contentStyle={styles.backBtn}
        onPress={onBack}
        accessibilityLabel="Volver"
      >
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
        <Text style={styles.backBtnText}>Volver</Text>
      </PressScale>
      <View style={styles.topbarTextWrap}>
        <Text style={styles.topbarTitle}>{title}</Text>
        {!!subtitle && <Text style={[styles.topbarSubt, subtitleStyle]}>{subtitle}</Text>}
      </View>
      {rightActions}
      {divider}
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    paddingTop: layout.screenTopPadding,
    paddingHorizontal: 20,
    paddingBottom: 16,
    // bgBase (no colors.glass, que ahora es blanco puro) — el header debe
    // leerse como parte de la página crema, no como blanco sin estilo. La
    // separación visual la da el hairline de abajo, no un cambio de tono.
    backgroundColor: colors.bgBase,
  },
  // Línea divisoria: sólo del ancho del contenido (no de punta a punta de la ventana).
  divider: {
    position: 'absolute',
    bottom: 0,
    height: 1,
    backgroundColor: colors.borderCard,
  },
  topbarRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingRight: 8,
  },
  backBtnText: {
    fontSize: 16,
    fontFamily: poppinsWeight('400'),
    color: colors.ink,
  },
  topbarTextWrap: {
    flex: 1,
  },
  topbarTitle: {
    fontSize: 20,
    fontFamily: poppinsWeight('700'),
    color: colors.navy,
  },
  topbarSubt: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 0,
  },
});
