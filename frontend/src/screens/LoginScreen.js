import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import AuthLayout from '../components/AuthLayout';
import CheckboxField from '../components/CheckboxField';
import PressScale from '../components/PressScale';
import { openDialog } from '../components/DialogHost';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(true);
  const [formError, setFormError] = useState('');
  const [credencialesMal, setCredencialesMal] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleLogin() {
    if (saving) return;
    setFormError('');
    setCredencialesMal(false);
    if (!email.trim() || !password) {
      setFormError('Escribí tu correo y tu contraseña.');
      return;
    }
    setSaving(true);
    try {
      // Al actualizarse `token`/`grupo` en AuthContext, App.js cambia de navegador solo.
      await login(email.trim(), password, recordar);
    } catch (err) {
      // 401: no se dice cuál de los dos falló (seguridad) y se ofrece recuperar la contraseña.
      if (err.status === 401) setCredencialesMal(true);
      else setFormError(err.mensaje);
      setSaving(false);
    }
  }

  // El backend todavía no manda mails de recuperación: se dice con claridad en vez de prometer algo que no existe.
  // TODO(backend): recuperación de contraseña por mail.
  function handleOlvidaste() {
    openDialog({
      variante: 'info',
      title: 'Recuperar tu contraseña',
      message: 'Todavía no podemos mandarte un mail para cambiarla. Escribile al equipo de DOMUS+ y te ayudamos a volver a entrar.',
      actions: [{ label: 'Entendido', variant: 'accent' }],
    });
  }

  return (
    <AuthLayout
      onBack={() => navigation.goBack()}
      switchTexto="¿No tenés cuenta?"
      switchEtiqueta="Registrate"
      onSwitch={() => navigation.navigate('Register')}
      panelTitulo="Qué bueno verte de nuevo."
      escena="login"
    >
      <Text style={styles.title} accessibilityRole="header">Iniciá sesión</Text>
      <Text style={styles.sub}>Entrá para ver cómo está tu familia.</Text>

      <FormField
        label="Correo electrónico"
        value={email}
        onChangeText={(t) => { setEmail(t); setCredencialesMal(false); }}
        placeholder="ana.perez@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={credencialesMal ? ' ' : ''}
      />
      <FormField
        label="Contraseña"
        accesorio={{ texto: '¿Olvidaste tu contraseña?', onPress: handleOlvidaste }}
        value={password}
        onChangeText={(t) => { setPassword(t); setCredencialesMal(false); }}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
        error={credencialesMal ? ' ' : ''}
        style={{ paddingBottom: 0 }}
      />

      {credencialesMal && (
        <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <Text style={styles.errorTexto}>
            No encontramos esa combinación de correo y contraseña. Revisalas o{' '}
            <Text style={styles.errorEnlace} onPress={handleOlvidaste} accessibilityRole="link">
              recuperá tu contraseña
            </Text>
            .
          </Text>
        </View>
      )}
      {!!formError && (
        <View style={styles.error} accessibilityRole="alert">
          <Text style={styles.errorTexto}>{formError}</Text>
        </View>
      )}

      <CheckboxField label="Mantener sesión iniciada" checked={recordar} onChange={setRecordar} style={styles.recordar} />

      <PrimaryButton title="Iniciar sesión" textoCargando="Entrando…" variant="accent" onPress={handleLogin} loading={saving} />

      <View style={styles.divisor} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.linea} />
      </View>

      <PressScale contentStyle={styles.invitacion} onPress={() => navigation.navigate('UnirseCodigo')} accessibilityLabel="¿Te invitaron a una familia? Ingresá el código">
        <Text style={styles.invitacionTexto}>
          ¿Te invitaron a una familia? <Text style={styles.enlace}>Ingresá el código</Text>
        </Text>
      </PressScale>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 40, lineHeight: 48, fontFamily: SERIF_BOLD, color: colors.ink },
  sub: { fontSize: 18, lineHeight: 27, color: colors.textBody, marginTop: 8, marginBottom: 28 },
  error: { marginTop: 12, padding: 14, borderRadius: 10, backgroundColor: '#FDECE8', borderWidth: 1, borderColor: 'rgba(166, 41, 27, 0.35)' },
  errorTexto: { fontSize: 16, lineHeight: 24, color: '#8C2F1B' },
  errorEnlace: { fontFamily: poppinsWeight('700'), textDecorationLine: 'underline', color: '#8C2F1B' },
  recordar: { marginTop: 12, marginBottom: 12 },
  divisor: { marginVertical: 24 },
  linea: { height: 1, backgroundColor: '#E8DFD5' },
  invitacion: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  invitacionTexto: { fontSize: 17, lineHeight: 25, color: colors.textBody, textAlign: 'center' },
  enlace: { fontFamily: poppinsWeight('600'), color: colors.accentStrong, textDecorationLine: 'underline' },
});
