import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import PaperCutout from './PaperCutout';
import PrimaryButton from './PrimaryButton';
import Ilustracion from './Ilustracion';

// Estado vacío cálido: un par de recortes de papel + mensaje claro + (opcional) acción directa.
// Usado por FamilyListScreen, CalendarScreen, EmergencyScreen y ProfileDetailScreen.
//  - `titulo` (opcional): frase corta en la tipografía de títulos, sobre el mensaje.
//  - `recortes`: [{ icon, tinte }] (hasta 3); por defecto, un corazón y una huella.
//  - `acciones`: [{ label, onPress, variant }] para más de una acción (la primera es la principal).
//    `actionLabel`/`onAction` siguen funcionando como atajo de una sola acción.
const RECORTES_POR_DEFECTO = [
  { icon: 'heart', tinte: 'terracota' },
  { icon: 'paw', tinte: 'salvia' },
];
const GIROS = [-7, 5, -3];

//  - `ilustracion` (opcional): nombre de una Ilustracion ('familia', 'calendario', 'aldia', 'mascota', 'vacuna',
//    'receta', 'ficha'). Si viene, reemplaza a los recortes.
export default function EmptyState({
  titulo,
  message,
  ilustracion,
  recortes = RECORTES_POR_DEFECTO,
  acciones,
  actionLabel,
  onAction,
  compacto = false,
}) {
  const lista = acciones || (actionLabel && onAction ? [{ label: actionLabel, onPress: onAction, variant: 'accent' }] : []);
  const tam = compacto ? 64 : 84;

  return (
    <View style={[styles.root, compacto && styles.rootCompacto]}>
      <View style={styles.recortes}>
        {ilustracion ? <Ilustracion nombre={ilustracion} size={compacto ? 80 : 112} /> : recortes.slice(0, 3).map((r, i) => (
          <PaperCutout
            key={r.icon}
            icon={r.icon}
            tinte={r.tinte}
            size={tam}
            rotate={GIROS[i % GIROS.length]}
            delay={i * 90}
            style={i > 0 && { marginLeft: -12, marginTop: i % 2 ? 10 : 0 }}
          />
        ))}
      </View>
      {!!titulo && <Text style={styles.titulo} accessibilityRole="header">{titulo}</Text>}
      <Text style={styles.message}>{message}</Text>
      {lista.length > 0 && (
        <View style={styles.acciones}>
          {lista.map((a, i) => (
            <PrimaryButton
              key={a.label}
              title={a.label}
              variant={a.variant || (i === 0 ? 'accent' : 'secondary')}
              fullWidth={false}
              onPress={a.onPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  rootCompacto: { paddingVertical: 20 },
  recortes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, paddingVertical: 8 },
  titulo: { fontSize: 26, lineHeight: 34, fontFamily: SERIF_BOLD, color: colors.ink, textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 16, lineHeight: 24, color: colors.textBody, textAlign: 'center', maxWidth: 420 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 20 },
});
