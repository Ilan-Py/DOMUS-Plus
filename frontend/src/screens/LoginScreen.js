import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { SERIF_BOLD } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import ErrorBanner from '../components/ErrorBanner';
import AuthLayout from '../components/AuthLayout';

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
    <AuthLayout
      onBack={() => navigation.goBack()}
      switchTexto="¿No tenés cuenta?"
      switchEtiqueta="Registrate"
      onSwitch={() => navigation.navigate('Register')}
      panelTitulo="Qué bueno verte de nuevo."
    >
      <Text style={styles.title} accessibilityRole="header">Iniciá sesión</Text>
      <Text style={styles.sub}>Ingresá para ver a tu familia y a tus mascotas.</Text>

      <FormField
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        placeholder="ana.perez@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Tu contraseña"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
        style={{ paddingBottom: 0 }}
      />

      <ErrorBanner message={formError} />

      <View style={styles.submit}>
        <PrimaryButton title="Iniciar sesión" variant="accent" onPress={handleLogin} loading={saving} />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 38, fontFamily: SERIF_BOLD, color: colors.ink },
  sub: { fontSize: 17, lineHeight: 25, color: colors.textBody, marginTop: 4, marginBottom: 24 },
  submit: { marginTop: 24 },
});
