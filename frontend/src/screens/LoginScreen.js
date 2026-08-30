import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, radii, shadow } from '../theme/colors';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleLogin() {
    // TODO: conectar con POST /api/auth/login
    navigation.navigate('MainTabs');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.authWrap}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkIcon}>⌂</Text>
            </View>
            <Text style={styles.brandTitle}>DOMUS+</Text>
            <Text style={styles.brandSubtitle}>
              La salud de tu familia y tus mascotas, en un solo lugar.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ana.perez@correo.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={[styles.field, { paddingBottom: 0 }]}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>
            <View style={styles.formSubmit}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleLogin}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>Iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.authSwitch}>
            <Text style={styles.authSwitchText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.authSwitchLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  authWrap: {
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 24,
    alignItems: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 22,
  },
  brandMark: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...shadow,
  },
  brandMarkIcon: {
    fontSize: 26,
    color: colors.navy,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.navy,
  },
  brandSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 4,
    maxWidth: 220,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  field: {
    paddingBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: radii.input,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: colors.navy,
  },
  formSubmit: {
    paddingTop: 6,
  },
  btnPrimary: {
    width: '100%',
    minHeight: 48,
    borderRadius: radii.button,
    backgroundColor: colors.blueDeep,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  authSwitch: {
    flexDirection: 'row',
    marginTop: 16,
  },
  authSwitchText: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  authSwitchLink: {
    fontSize: 12.5,
    color: colors.blue,
    fontWeight: '600',
  },
});
