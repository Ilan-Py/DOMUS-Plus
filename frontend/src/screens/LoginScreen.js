import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, shadow, glassPanel } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import ErrorBanner from '../components/ErrorBanner';
import BackgroundBlobs from '../components/BackgroundBlobs';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleLogin() {
    setFormError('');
    setSaving(true);
    try {
      // Al actualizarse `token`/`grupo` en AuthContext, App.js cambia de
      // navegador automáticamente — no se navega manualmente desde acá.
      await login(email, password);
    } catch (err) {
      // client.js siempre normaliza a { status, mensaje } — para 401, mensaje
      // ya es 'Credenciales incorrectas.' (authController.login), texto usable tal cual.
      setFormError(err.mensaje);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <BackgroundBlobs />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.authWrap}>
          <View style={styles.brand}>
            <Text style={styles.brandTitle}>DOMUS+</Text>
            <Text style={styles.brandSubtitle}>
              La salud de tu familia y tus mascotas, en un solo lugar.
            </Text>
          </View>

          <View style={styles.cardWrap}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeIcon}>⌂</Text>
            </View>

            <View style={styles.card}>
              <FormField
                label="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                placeholder="ana.perez@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FormField
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                style={{ paddingBottom: 0 }}
              />

              <ErrorBanner message={formError} />
            </View>

            <View style={styles.submitFloat}>
              <PrimaryButton title="Iniciar sesión" onPress={handleLogin} loading={saving} />
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
    backgroundColor: colors.bgBase,
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
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.navy,
  },
  brandSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 4,
    maxWidth: 220,
    textAlign: 'center',
  },
  // Contenedor relativo compartido por la insignia, el card y el botón
  // flotante — los tres se posicionan unos respecto a otros vía absolute.
  cardWrap: {
    width: '100%',
    position: 'relative',
    marginTop: 28,
    marginBottom: 24,
  },
  brandBadge: {
    position: 'absolute',
    top: -28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...shadow,
  },
  brandBadgeIcon: {
    fontSize: 24,
    color: colors.ink,
  },
  card: {
    width: '100%',
    ...glassPanel,
    paddingHorizontal: 20,
    paddingVertical: 22,
    overflow: 'hidden', // recorta el contenido al radio redondeado del card
  },
  submitFloat: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: -22,
    zIndex: 3,
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
    color: colors.ink,
    fontWeight: '600',
    fontFamily: poppinsWeight('600'),
  },
});
