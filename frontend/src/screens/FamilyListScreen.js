import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, glassPanel } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import RadialFab from '../components/RadialFab';
import PressScale from '../components/PressScale';
import Skeleton from '../components/Skeleton';
import { confirmarDestructivo } from '../utils/confirm';

const TIPO_LABELS = { adulto: 'Adulto', menor: 'Menor', mayor: 'Mayor' };

// Tinte de avatar por tipo de integrante — tres familias distintas, una por
// tipo. Las mascotas no tienen `tipo` adulto/menor/mayor — caen en
// DEFAULT_AVATAR_TINT (mismo tono que 'menor', sage).
const AVATAR_TINTS = {
  adulto: { bg: colors.avatarAdultBg, text: colors.avatarAdultText },
  mayor: { bg: colors.avatarSeniorBg, text: colors.avatarSeniorText },
  menor: { bg: colors.sage, text: colors.sageDeep },
};
const DEFAULT_AVATAR_TINT = { bg: colors.sage, text: colors.sageDeep };

// El backend guarda fecha_nacimiento, no una edad — se calcula acá para el
// subtítulo ("Adulto · 41 años") que antes venía escrito a mano en el mock.
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad -= 1;
  return edad;
}

// icon ahora es un nombre de Ionicons, no un emoji — el emoji traía su
// propio color fijo (ver comentario que vivía acá antes) e ignoraba tint.text
// por completo; Ionicons sí respeta `color`, así que el tinte por tipo
// finalmente tiene efecto real en el ícono, no sólo en el fondo del avatar.
function MemberCard({ icon, nombre, subt, tipo, onPress, onLongPress, disabled }) {
  const tint = AVATAR_TINTS[tipo] || DEFAULT_AVATAR_TINT;
  return (
    <PressScale
      contentStyle={styles.memberCard}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
    >
      <View style={[styles.avatar, { backgroundColor: tint.bg }]}>
        <Ionicons name={icon} size={22} color={tint.text} />
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{nombre}</Text>
        <Text style={styles.memberSubt}>{subt}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </PressScale>
  );
}

// Silueta de MemberCard — mismo layout (avatar circular + dos líneas +
// espacio del chevron) armado con el Skeleton compartido.
function SkeletonMemberCard() {
  return (
    <View style={styles.memberCard}>
      <Skeleton width={46} height={46} borderRadius={15} />
      <View style={styles.memberInfo}>
        <Skeleton width="60%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={11} />
      </View>
    </View>
  );
}

export default function FamilyListScreen({ navigation }) {
  const { grupo } = useAuth();
  const { integrantes, mascotas, loading, error, refresh } = useFamily();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  function openProfile({ id, tipo, nombre, member }) {
    navigation.navigate('ProfileDetail', { id, tipo, nombre, member });
  }

  function handleEditar(tipo, item) {
    navigation.navigate('AddMember', { tipoMiembro: tipo, memberToEdit: item });
  }

  async function handleEliminar(tipo, item) {
    setBusy(true);
    setActionError('');
    try {
      const url = tipo === 'integrante' ? `/api/familia/integrantes/${item.id}` : `/api/familia/mascotas/${item.id}`;
      await api.delete(url);
      await refresh();
    } catch (err) {
      setActionError(err.mensaje);
    } finally {
      setBusy(false);
    }
  }

  function confirmEliminar(tipo, item, nombreCompleto) {
    confirmarDestructivo(
      'Eliminar',
      `¿Seguro que querés eliminar a ${nombreCompleto}? Se perderá su historial de salud asociado.`,
      () => handleEliminar(tipo, item)
    );
  }

  // Long-press en la card — abre el menú de 3 opciones vía Alert.alert
  // nativo (funciona bien ahí, sin cambios). Alert.alert es un no-op en web
  // (ver utils/confirm.js) y no hay equivalente de 3 botones en las APIs de
  // browser — misma razón ya aplicada en ProfileDetailScreen.js — así que en
  // web el long-press degrada directo a "confirmar eliminar" en vez de no
  // hacer nada en silencio. Editar sigue alcanzable en web tocando la card
  // (abre ProfileDetailScreen, que ya tiene su propio botón de editar).
  function handleLongPress(tipo, item, nombreCompleto) {
    if (busy) return;
    if (Platform.OS === 'web') {
      confirmEliminar(tipo, item, nombreCompleto);
      return;
    }
    Alert.alert(
      nombreCompleto,
      undefined,
      [
        { text: 'Editar', onPress: () => handleEditar(tipo, item) },
        { text: 'Eliminar', style: 'destructive', onPress: () => confirmEliminar(tipo, item, nombreCompleto) },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>{grupo?.nombre}</Text>
        <Text style={styles.topbarSubt}>
          {integrantes.length} integrantes · {mascotas.length} mascota
        </Text>
      </View>

      {loading ? (
        <View style={styles.scroll}>
          <Text style={styles.sectionLabel}>INTEGRANTES</Text>
          <SkeletonMemberCard />
          <SkeletonMemberCard />
          <Text style={styles.sectionLabel}>MASCOTAS</Text>
          <SkeletonMemberCard />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {(!!error || !!actionError) && (
            <View style={styles.errorWrap}>
              <ErrorBanner
                message={error || actionError}
                onDismiss={error ? undefined : () => setActionError('')}
              />
            </View>
          )}

          <Text style={styles.sectionLabel}>INTEGRANTES</Text>
          {integrantes.length === 0 ? (
            <EmptyState message="No hay integrantes registrados." />
          ) : (
            integrantes.map((item) => {
              const edad = calcularEdad(item.fecha_nacimiento);
              const nombreCompleto = `${item.nombre} ${item.apellido}`;
              return (
                <MemberCard
                  key={`integrante-${item.id}`}
                  icon="person-outline"
                  nombre={nombreCompleto}
                  subt={`${TIPO_LABELS[item.tipo] ?? item.tipo}${edad !== null ? ` · ${edad} años` : ''}`}
                  tipo={item.tipo}
                  disabled={busy}
                  onPress={() =>
                    openProfile({
                      id: item.id,
                      tipo: 'integrante',
                      nombre: nombreCompleto,
                      member: item,
                    })
                  }
                  onLongPress={() => handleLongPress('integrante', item, nombreCompleto)}
                />
              );
            })
          )}

          <Text style={styles.sectionLabel}>MASCOTAS</Text>
          {mascotas.length === 0 ? (
            <EmptyState message="No hay mascotas registradas." />
          ) : (
            mascotas.map((item) => (
              <MemberCard
                key={`mascota-${item.id}`}
                icon="paw-outline"
                nombre={item.nombre}
                subt={item.raza ? `${item.especie} · ${item.raza}` : item.especie}
                disabled={busy}
                onPress={() => openProfile({ id: item.id, tipo: 'mascota', nombre: item.nombre, member: item })}
                onLongPress={() => handleLongPress('mascota', item, item.nombre)}
              />
            ))
          )}
        </ScrollView>
      )}

      <RadialFab
        style={styles.fab}
        onPress={() => navigation.navigate('AddMember')}
        options={[
          {
            key: 'persona',
            icon: 'person-outline',
            label: 'Persona',
            bg: colors.avatarAdultBg,
            fg: colors.avatarAdultText,
            onPress: () => navigation.navigate('AddMember', { tipoMiembro: 'integrante' }),
          },
          {
            key: 'mascota',
            icon: 'paw-outline',
            label: 'Mascota',
            bg: colors.sage,
            fg: colors.sageDeep,
            onPress: () => navigation.navigate('AddMember', { tipoMiembro: 'mascota' }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  topbar: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 16,
    // bgBase (no colors.glass, que ahora es blanco puro) — el header debe
    // leerse como parte de la página crema, no como blanco sin estilo. La
    // separación visual la da el hairline de abajo, no un cambio de tono.
    backgroundColor: colors.bgBase,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
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
  scroll: {
    paddingBottom: 100,
  },
  errorWrap: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  sectionLabel: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginHorizontal: 18,
    marginBottom: 10,
    minHeight: 48,
    // Sin BlurView acá a propósito — lista con scroll, blur real por fila
    // sería un riesgo de performance (vs. Login/Register, pantallas estáticas).
    ...glassPanel,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    // backgroundColor viene inline por tipo (ver AVATAR_TINTS) — no queda
    // valor fijo acá.
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14.5,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.navy,
  },
  memberSubt: {
    fontSize: 12.5,
    fontWeight: '400',
    fontFamily: poppinsWeight('400'),
    color: colors.textMutedLight,
    marginTop: 1,
  },
  chevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  // Sólo posición acá — RadialFab trae su propio tamaño/forma/sombra.
  fab: {
    position: 'absolute',
    right: 18,
    // 90 (no 24) — la tab bar flotante (position:'absolute' en MainTabs)
    // se superpondría al FAB si se quedara pegado al borde real.
    bottom: 90,
  },
});
