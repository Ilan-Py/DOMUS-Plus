import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';
import useReducedMotion from '../hooks/useReducedMotion';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import useFirstErrorFocus from '../hooks/useFirstErrorFocus';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import ErrorBanner from '../components/ErrorBanner';
import AuthLayout from '../components/AuthLayout';
import { LEGAL } from '../utils/legal';

// Misma regla que authController.js: mínimo 8 caracteres, 1 mayúscula, 1 número
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
// FRM-01: el error nombra lo que falta (antes decía «mirá los que siguen en gris», sólo color).
function faltanDeLaContrasena({ okLargo, okMayus, okNum }) {
  const faltan = [!okLargo && '8 caracteres o más', !okMayus && 'una mayúscula', !okNum && 'un número'].filter(Boolean);
  if (!faltan.length) return '';
  const lista = faltan.length === 1 ? faltan[0] : `${faltan.slice(0, -1).join(', ')} y ${faltan[faltan.length - 1]}`;
  return `A la contraseña le falta: ${lista}.`;
}

function ModalLegal({ tipo, onClose }) {
  const t = tipo ? LEGAL[tipo] : null;
  return (
    <Modal visible={!!t} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalFondo}>
        <View style={styles.modalCard} accessibilityViewIsModal>
          <Text style={styles.modalTitulo} accessibilityRole="header">{t?.titulo}</Text>
          {t?.parrafos.map((p) => (
            <Text key={p} style={styles.modalTexto}>{p}</Text>
          ))}
          <View style={{ marginTop: 8 }}>
            <PrimaryButton title="Entendido" variant="accent" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Requisitos de la contraseña como píldoras: pasan a verde a medida que se cumplen.
function RequisitoPill({ ok, text }) {
  // Pequeño "pop" cuando el requisito pasa a cumplido (no al montar); sin movimiento si el
  // sistema pide reducirlo — el cambio de color y de ícono ya alcanza como señal.
  const reduceMotion = useReducedMotion();
  const pop = useRef(new Animated.Value(1)).current;
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (!ok || reduceMotion) return;
    pop.setValue(0.88);
    Animated.spring(pop, { toValue: 1, bounciness: 10, speed: 18, useNativeDriver: true }).start();
  }, [ok, pop, reduceMotion]);

  return (
    <Animated.View
      style={[styles.pill, ok && styles.pillOk, { transform: [{ scale: pop }] }]}
      accessible
      accessibilityLabel={`${text}: ${ok ? 'cumple' : 'falta'}`}
    >
      <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={ok ? '#2F6B3A' : '#574E49'} />
      <Text style={[styles.pillText, ok && styles.pillTextOk]}>{text}</Text>
    </Animated.View>
  );
}

export default function RegisterScreen({ navigation }) {
  const { register, codigoPendiente } = useAuth();
  const [legal, setLegal] = useState(null);
  const { ref, focusFirst } = useFirstErrorFocus();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const okLargo = password.length >= 8;
  const okMayus = /[A-Z]/.test(password);
  const okNum = /\d/.test(password);

  async function handleRegister() {
    setEmailError('');
    setPasswordError('');
    setFormError('');

    if (!PASSWORD_RULE.test(password)) {
      setPasswordError(faltanDeLaContrasena({ okLargo, okMayus, okNum }));
      focusFirst([[true, 'password']]);
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
        focusFirst([[true, 'email']]);
      } else if (err.status === 400) {
        setPasswordError(err.mensaje);
        focusFirst([[true, 'password']]);
      } else {
        setFormError(err.mensaje);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthLayout
      onBack={() => navigation.goBack()}
      switchTexto="¿Ya tenés cuenta?"
      switchEtiqueta="Iniciá sesión"
      onSwitch={() => navigation.navigate('Login')}
      panelTitulo="Toda la salud de tu familia, en un solo lugar."
      panelVariante="registro"
    >
      <Text style={styles.title} accessibilityRole="header">Creá tu cuenta</Text>
      <Text style={styles.sub}>Para cuidar a tu familia y a tus mascotas.</Text>
      {!!codigoPendiente && (
        <Text style={styles.codigoNota}>Cuando termines, te unís al grupo con el código {codigoPendiente}.</Text>
      )}

      <View style={styles.row2}>
        <FormField
          style={styles.col2}
          label="Nombre"
          value={nombre}
          onChangeText={setNombre}
          placeholder="Ana"
          autoComplete="given-name"
          textContentType="givenName"
        />
        <FormField
          style={styles.col2}
          label="Apellido"
          value={apellido}
          onChangeText={setApellido}
          placeholder="Pérez"
          autoComplete="family-name"
          textContentType="familyName"
        />
      </View>
      <FormField
        inputRef={ref('email')}
        label="Correo electrónico"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (emailError) setEmailError('');
        }}
        placeholder="ana.perez@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={emailError}
      />
      <FormField
        inputRef={ref('password')}
        label="Contraseña"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (passwordError) setPasswordError('');
        }}
        placeholder="Elegí una contraseña"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleRegister}
        // Sin esto el input se desenfoca al enviar y deshace el foco al primer error
        blurOnSubmit={false}
        error={passwordError}
        style={{ paddingBottom: 0 }}
      />
      <View style={styles.pills} accessibilityLiveRegion="polite">
        <RequisitoPill ok={okLargo} text="8 caracteres" />
        <RequisitoPill ok={okMayus} text="Una mayúscula" />
        <RequisitoPill ok={okNum} text="Un número" />
      </View>

      <ErrorBanner message={formError} />

      <View style={styles.submit}>
        <PrimaryButton title="Crear cuenta" variant="accent" onPress={handleRegister} loading={saving} />
      </View>
      <Text style={styles.legalText}>
        Al crear tu cuenta aceptás los{' '}
        <Text style={styles.legalLink} onPress={() => setLegal('terminos')} accessibilityRole="link">Términos de uso</Text>
        {' '}y la{' '}
        <Text style={styles.legalLink} onPress={() => setLegal('privacidad')} accessibilityRole="link">Política de privacidad</Text>.
      </Text>
      <ModalLegal tipo={legal} onClose={() => setLegal(null)} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 40, lineHeight: 48, fontFamily: SERIF_BOLD, color: colors.ink },
  codigoNota: { fontSize: 16, lineHeight: 24, color: colors.accentStrong, fontFamily: poppinsWeight('600'), marginTop: -16, marginBottom: 24 },
  sub: { fontSize: 17, lineHeight: 26, color: colors.textBody, marginTop: 8, marginBottom: 32 },
  row2: { flexDirection: 'row', gap: 12 },
  col2: { flex: 1, minWidth: 0 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#F2EAE1' },
  pillOk: { backgroundColor: '#E3EEE2' },
  pillText: { fontSize: 14, lineHeight: 20, color: '#574E49', fontFamily: poppinsWeight('600') },
  pillTextOk: { color: '#2F6B3A' },
  submit: { marginTop: 24 },
  legalText: { fontSize: 15, lineHeight: 30, color: '#574E49', marginTop: 16 },
  legalLink: { color: colors.accentStrong, textDecorationLine: 'underline', fontFamily: poppinsWeight('600') },
  modalFondo: { flex: 1, backgroundColor: 'rgba(42,36,33,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 480, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, gap: 12 },
  modalTitulo: { fontSize: 22, lineHeight: 30, fontFamily: SERIF_BOLD, color: colors.ink },
  modalTexto: { fontSize: 16, lineHeight: 25, color: '#3F3631' },
});
