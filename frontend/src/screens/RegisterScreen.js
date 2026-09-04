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

// Misma regla que authController.js: mínimo 8 caracteres, 1 mayúscula, 1 número
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_RULE_MSG = 'La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número.';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleRegister() {
    setEmailError('');
    setPasswordError('');
    setFormError('');

    if (!PASSWORD_RULE.test(password)) {
      setPasswordError(PASSWORD_RULE_MSG);
      return;
    }

    setSaving(true);
    try {
      // register() hace POST /api/auth/registrar y encadena login() con las
      // mismas credenciales (el endpoint de registro no devuelve token).
      // Al actualizarse `token` sin `grupo`, App.js muestra GroupSetup
      // automáticamente — no se navega manualmente desde acá.
      await register({ nombre, apellido, email, password });
    } catch (err) {
      if (err.status === 409) {
        setEmailError(err.mensaje);
      } else if (err.status === 400) {
        setPasswordError(err.mensaje);
      } else {
        setFormError(err.mensaje);
      }
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
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backLinkText}>‹ Volver a iniciar sesión</Text>
          </TouchableOpacity>

          <View style={styles.brand}>
            <Text style={styles.brandTitle}>Crear cuenta</Text>
            <Text style={styles.brandSubtitle}>
              Empieza a centralizar la salud de tu familia.
            </Text>
          </View>

          <View style={styles.cardWrap}>
            <View style={styles.card}>
              <FormField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ana" />
              <FormField
                label="Apellido"
                value={apellido}
                onChangeText={setApellido}
                placeholder="Pérez"
              />
              <FormField
                label="Correo electrónico"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
                placeholder="ana.perez@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={emailError}
              />
              <FormField
                label="Contraseña"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="••••••••"
                secureTextEntry
                error={passwordError}
                style={{ paddingBottom: 0 }}
              />

              <ErrorBanner message={formError} />
            </View>

            <View style={styles.submitFloat}>
              <PrimaryButton title="Crear cuenta" onPress={handleRegister} loading={saving} />
            </View>
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
    alignItems: 'stretch',
  },
  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  backLinkText: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  brand: {
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.navy,
  },
  brandSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 4,
  },
  // Contenedor relativo compartido por el card y el botón flotante — el
  // botón se posiciona respecto a él vía absolute.
  cardWrap: {
    width: '100%',
    position: 'relative',
    marginBottom: 24,
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
});
