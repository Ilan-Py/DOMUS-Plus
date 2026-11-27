import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { SERIF_BOLD } from '../theme/typography';
import PaperCutout from '../components/PaperCutout';
import PrimaryButton from '../components/PrimaryButton';
import Logo from '../components/Logo';

// Página 404 (web): se muestra cuando la dirección no corresponde a ninguna pantalla — un enlace
// viejo, o un código de invitación pegado en la barra de direcciones por error.
export default function NotFoundScreen({ onVolver }) {
  useEffect(() => {
    if (typeof document !== 'undefined') document.title = 'Página no encontrada · DOMUS+';
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.marca}>
        <Logo variante="terracota" size={40} />
      </View>
      <View style={styles.recortes}>
        <PaperCutout icon="paw" tinte="salvia" size={88} rotate={-8} />
        <PaperCutout icon="help" tinte="terracota" size={104} rotate={4} delay={100} style={styles.centro} />
        <PaperCutout icon="heart" tinte="arena" size={88} rotate={9} delay={200} />
      </View>
      <Text style={styles.titulo} accessibilityRole="header">No encontramos esa página</Text>
      <Text style={styles.texto}>
        Puede que el enlace sea viejo o tenga un error. Si era un código de invitación, revisá que esté bien escrito.
      </Text>
      <View style={styles.accion}>
        <PrimaryButton title="Volver al inicio" variant="accent" fullWidth={false} onPress={onVolver} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  marca: { position: 'absolute', top: 24, left: 24 },
  recortes: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  centro: { marginHorizontal: -8, zIndex: 1 },
  titulo: { fontSize: 36, lineHeight: 44, fontFamily: SERIF_BOLD, color: colors.ink, textAlign: 'center' },
  texto: { fontSize: 18, lineHeight: 27, color: colors.textBody, textAlign: 'center', maxWidth: 460, marginTop: 12 },
  accion: { marginTop: 28 },
});
