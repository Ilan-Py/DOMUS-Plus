import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { colors, radii, shadow } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import PrimaryButton from '../components/PrimaryButton';

export default function AccountScreen() {
  const { usuario, grupo, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  function confirmLogout() {
    // react-native-web no implementa los botones/callbacks de Alert.alert
    // (no-op silencioso ahí) — sin esta rama, "Cerrar sesión" no hacía nada
    // en web porque handleLogout nunca se disparaba.
    if (Platform.OS === 'web') {
      if (window.confirm('¿Seguro que querés cerrar sesión?')) {
        handleLogout();
      }
      return;
    }

    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que querés cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: handleLogout },
      ],
    );
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      // RootNavigator en App.js cambia al stack de auth automáticamente al
      // quedar `token` en null — mismo patrón que login/register/crearGrupo.
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>Mi cuenta</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>
              {usuario?.nombre} {usuario?.apellido}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <Text style={styles.value}>{usuario?.email}</Text>
          </View>
          <View style={[styles.field, { paddingBottom: 0 }]}>
            <Text style={styles.label}>Grupo familiar</Text>
            <Text style={styles.value}>{grupo?.nombre}</Text>
          </View>
        </View>

        <PrimaryButton
          title="Cerrar sesión"
          onPress={confirmLogout}
          loading={loggingOut}
          variant="danger"
        />
      </View>
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
    // bgBase (no colors.glass, que ahora es blanco puro) — mismo criterio
    // que el resto de los headers, ver FamilyListScreen.js.
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
  content: {
    padding: 18,
    // paddingBottom explícito (no scrollable) para que "Cerrar sesión" no
    // termine bajo la tab bar flotante si el contenido crece (fuente grande
    // de accesibilidad, pantalla chica).
    paddingBottom: 100,
    gap: 16,
  },
  card: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    paddingHorizontal: 20,
    paddingVertical: 22,
    ...shadow,
  },
  field: {
    paddingBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
    color: colors.textMuted,
    marginBottom: 4,
  },
  value: {
    fontSize: 15.5,
    color: colors.navy,
  },
});
