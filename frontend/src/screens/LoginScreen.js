import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import ErrorBanner from '../components/ErrorBanner';
import AuthLayout from '../components/AuthLayout';
import CheckboxField from '../components/CheckboxField';
import CodigoExpandible from '../components/CodigoExpandible';
import PressScale from '../components/PressScale';
import { openDialog } from '../components/DialogHost';

export default function LoginScreen({ navigation }) {
  const { login, setCodigoPendiente } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleLogin() {
    setFormError('');
    setSaving(true);
    try {
      // Al actualizarse `token`/`grupo` en AuthContext, App.js cambia de
      // navegador automáticamente — no se navega manualmente desde acá.
      await login(email, password, recordar);
    } catch (err) {
      // client.js siempre normaliza a { status, mensaje } — para 401, mensaje
      // ya es el texto amable de authController.login ("Ese correo o contraseña no coinciden…").
      setFormError(err.mensaje);
    } finally {
      setSaving(false);
    }
  }

  // El backend todavía no tiene recuperación de contraseña (no hay envío de mails):
  // se avisa con claridad en vez de prometer algo que no existe.
  function handleOlvidaste() {
    openDialog({
      title: 'Recuperar tu contraseña',
      message:
        'Todavía no podemos enviarte un mail para cambiarla. Escribile al equipo de DOMUS+ y te ayudamos a volver a entrar.',
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
    >
      <Text style={styles.title} accessibilityRole="header">Iniciá sesión</Text>
      <Text style={styles.sub}>Entrá para ver cómo está tu familia y tus mascotas.</Text>

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
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
        style={{ paddingBottom: 0 }}
      />

      <ErrorBanner message={formError} />

      <View style={styles.opciones}>
        <CheckboxField label="Mantener sesión iniciada" checked={recordar} onChange={setRecordar} style={styles.recordar} />
        <PressScale contentStyle={styles.olvido} onPress={handleOlvidaste} accessibilityLabel="¿Olvidaste tu contraseña?">
          <Text style={styles.olvidoText}>¿Olvidaste tu contraseña?</Text>
        </PressScale>
      </View>

      <View style={styles.submit}>
        <PrimaryButton title="Iniciar sesión" variant="accent" onPress={handleLogin} loading={saving} />
      </View>

      <View style={styles.divisor} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.linea} />
        <Text style={styles.divisorText}>o</Text>
        <View style={styles.linea} />
      </View>

      {/* El botón se despliega acá mismo en el campo del código (no manda a otra pantalla). */}
      <CodigoExpandible
        onContinuar={(codigo) => {
          setCodigoPendiente(codigo);
          navigation.navigate('Register');
        }}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 40, lineHeight: 48, fontFamily: SERIF_BOLD, color: colors.ink },
  sub: { fontSize: 17, lineHeight: 26, color: colors.textBody, marginTop: 8, marginBottom: 32 },
  opciones: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
    marginTop: 12,
  },
  // Una sola fila siempre: la casilla cede ancho (su texto baja de renglón) antes que el enlace.
  recordar: { flexShrink: 1 },
  olvido: { minHeight: 48, justifyContent: 'center', flexShrink: 0 },
  olvidoText: { fontSize: 15, color: colors.accentStrong, fontFamily: poppinsWeight('600'), textDecorationLine: 'underline' },
  submit: { marginTop: 12 },
  divisor: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 20 },
  linea: { flex: 1, height: 1, backgroundColor: '#E8DFD5' },
  divisorText: { fontSize: 16, color: colors.textMuted },
});
