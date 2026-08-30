import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, radii, shadow } from '../theme/colors';

// Datos mock — coinciden con SUBJECTS del mockup (docs/DOMUS+ Mockup.html)
const INTEGRANTES = [
  { id: 'juan', nombre: 'Juan Pérez', subt: 'Adulto · 41 años', icon: '🧑' },
  { id: 'maria', nombre: 'María Pérez', subt: 'Menor · 9 años', icon: '🧒' },
];
const MASCOTAS = [
  { id: 'firulais', nombre: 'Firulais', subt: 'Perro · Labrador', icon: '🐾' },
];

function MemberCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.memberCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarIcon}>{item.icon}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.nombre}</Text>
        <Text style={styles.memberSubt}>{item.subt}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function FamilyListScreen({ navigation }) {
  function openProfile(subjectId) {
    navigation.navigate('ProfileDetail', { subjectId });
  }

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>Familia Pérez</Text>
        <Text style={styles.topbarSubt}>
          {INTEGRANTES.length} integrantes · {MASCOTAS.length} mascota
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>INTEGRANTES</Text>
        {INTEGRANTES.map((item) => (
          <MemberCard key={item.id} item={item} onPress={() => openProfile(item.id)} />
        ))}

        <Text style={styles.sectionLabel}>MASCOTAS</Text>
        {MASCOTAS.map((item) => (
          <MemberCard key={item.id} item={item} onPress={() => openProfile(item.id)} />
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMember')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topbar: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: 'rgba(156,201,255,0.25)',
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  topbarTitle: {
    fontSize: 19,
    fontWeight: '600',
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
  sectionLabel: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textMuted,
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
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 22,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.navy,
  },
  memberSubt: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  chevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blueDeep,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 30,
  },
});
