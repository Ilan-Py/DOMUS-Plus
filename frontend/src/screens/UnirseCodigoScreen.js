import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { SERIF_BOLD } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import AuthLayout from '../components/AuthLayout';

// «¿Te invitaron a una familia? Ingresá el código»: pantalla propia (antes era un acordeón que parecía un select),
// con la escena de la puerta y el felpudo. Primero se crea la cuenta; el código se aplica solo al terminar.
export default function UnirseCodigoScreen({ navigation }) {
  const { setCodigoPendiente, codigoPendiente } = useAuth();
  const [codigo, setCodigo] = useState(codigoPendiente || '');
  const [error, setError] = useState('');

  function seguir() {
    if (!codigo.trim()) {
      setError('Escribí el código que te pasaron.');
      return;
    }
    setCodigoPendiente(codigo.trim().toUpperCase());
    navigation.navigate('Register');
  }

  return (
    <AuthLayout
      onBack={() => navigation.goBack()}
      switchTexto="¿Ya tenés cuenta?"
      switchEtiqueta="Iniciá sesión"
      onSwitch={() => navigation.navigate('Login')}
      panelTitulo="Te estaban esperando."
      escena="codigo"
    >
      <Text style={styles.title} accessibilityRole="header">Sumate a tu familia</Text>
      <Text style={styles.sub}>Escribí el código que te pasaron. Después creás tu cuenta y entrás directo a su familia.</Text>
      <FormField
        label="Código de invitación"
        value={codigo}
        onChangeText={(t) => { setCodigo(t); setError(''); }}
        placeholder="ABC1234"
        autoCapitalize="characters"
        returnKeyType="go"
        onSubmitEditing={seguir}
        error={error}
      />
      <PrimaryButton title="Seguir" variant="accent" onPress={seguir} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 40, lineHeight: 48, fontFamily: SERIF_BOLD, color: colors.ink },
  sub: { fontSize: 18, lineHeight: 27, color: colors.textBody, marginTop: 8, marginBottom: 28 },
});
