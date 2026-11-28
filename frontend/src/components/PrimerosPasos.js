import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getList } from '../api/client';
import PaperCard from './PaperCard';
import PressScale from './PressScale';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';

// Primeros pasos (después del asistente de bienvenida), en Familia. Con los nombres que se cargaron:
//   «Completá la ficha de Nélida» · «¿Bruno ya tiene sus vacunas?» · «Agregá tu primera medicación» · «Invitá a alguien»
// Cada paso se tilda solo cuando se cumple. Se puede descartar (queda guardado en el dispositivo, por familia) y
// desaparece cuando está todo hecho.
const clave = (grupoId) => `domus_primeros_pasos_oculto:${grupoId}`;

export default function PrimerosPasos({ grupoId, integrantes, mascotas, avisos, vacunas, navigation }) {
  const [oculto, setOculto] = useState(true);
  const [personasConAcceso, setPersonasConAcceso] = useState(null);

  useEffect(() => {
    if (!grupoId) return;
    AsyncStorage.getItem(clave(grupoId)).then((v) => setOculto(v === '1')).catch(() => setOculto(false));
    getList('/api/familia/grupo/miembros').then((m) => setPersonasConAcceso(m.length)).catch(() => setPersonasConAcceso(null));
  }, [grupoId]);

  const fichaIncompleta = integrantes.find((i) => !i.tipo_sangre || !i.alergias);
  const mascotaSinVacunas = mascotas.find((m) => !vacunas.some((v) => v.duenoClase === 'mascota' && v.duenoId === m.id));
  const hayMedicacion = (avisos || []).some((a) => a.tipo === 'medicacion');

  const pasos = [
    fichaIncompleta
      ? { clave: 'ficha', hecho: false, texto: `Completá la ficha de ${fichaIncompleta.nombre}`, ir: () => navigation.navigate('Emergency', { id: fichaIncompleta.id, nombre: `${fichaIncompleta.nombre} ${fichaIncompleta.apellido}` }) }
      : integrantes.length
        ? { clave: 'ficha', hecho: true, texto: 'Fichas de emergencia completas' }
        : null,
    mascotaSinVacunas
      ? { clave: 'vacunas', hecho: false, texto: `¿${mascotaSinVacunas.nombre} ya tiene sus vacunas?`, ir: () => navigation.navigate('ProfileDetail', { id: mascotaSinVacunas.id, tipo: 'mascota', nombre: mascotaSinVacunas.nombre, member: mascotaSinVacunas }) }
      : null,
    {
      clave: 'medicacion',
      hecho: hayMedicacion,
      texto: hayMedicacion ? 'Ya hay medicación programada' : 'Agregá tu primera medicación',
      ir: () => navigation.navigate('Calendario', { screen: 'AddReminder', params: { tipo: 'medicacion' } }),
    },
    personasConAcceso === null
      ? null
      : { clave: 'invitar', hecho: personasConAcceso > 1, texto: personasConAcceso > 1 ? 'Ya invitaste a alguien' : 'Invitá a alguien', ir: () => navigation.navigate('Cuenta') },
  ].filter(Boolean);

  const pendientes = pasos.filter((p) => !p.hecho).length;
  if (oculto || !pasos.length || pendientes === 0) return null;

  function descartar() {
    setOculto(true);
    AsyncStorage.setItem(clave(grupoId), '1').catch(() => {});
  }

  return (
    <PaperCard nivel={2} hoja="mostaza" rotacion={1} style={styles.card} wrapperStyle={{ marginRight: 7, marginBottom: 8 }}>
      <View style={styles.cab}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo} accessibilityRole="header">Primeros pasos</Text>
          <Text style={styles.sub}>{pendientes === 1 ? 'Te queda uno.' : `Te quedan ${pendientes}.`}</Text>
        </View>
        <PressScale contentStyle={styles.cerrar} onPress={descartar} accessibilityLabel="Ocultar los primeros pasos">
          <Ionicons name="close" size={22} color={colors.textBody} />
        </PressScale>
      </View>
      {pasos.map((p) => (
        <PressScale
          key={p.clave}
          contentStyle={styles.paso}
          onPress={p.hecho ? undefined : p.ir}
          disabled={p.hecho}
          accessibilityRole={p.hecho ? undefined : 'button'}
          accessibilityLabel={`${p.texto}${p.hecho ? ', hecho' : ''}`}
        >
          <View style={[styles.check, p.hecho && styles.checkHecho]}>{p.hecho && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}</View>
          <Text style={[styles.pasoTexto, p.hecho && styles.pasoHecho]}>{p.texto}</Text>
          {!p.hecho && <Ionicons name="chevron-forward" size={18} color={colors.accentStrong} />}
        </PressScale>
      ))}
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: 4 },
  cab: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  titulo: { fontSize: 22, lineHeight: 30, fontFamily: SERIF_BOLD, color: colors.ink },
  sub: { fontSize: 15, lineHeight: 22, color: colors.textBody },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(42,36,33,0.25)', alignItems: 'center', justifyContent: 'center' },
  checkHecho: { backgroundColor: '#4A6B5D', borderColor: '#4A6B5D' },
  pasoTexto: { flex: 1, fontSize: 17, lineHeight: 24, fontFamily: poppinsWeight('600'), color: colors.ink },
  pasoHecho: { color: '#6B6357', textDecorationLine: 'line-through', fontFamily: poppinsWeight('400') },
});
