import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, glassShadow } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import { CERRAR_SESION } from '../utils/textos';
import ErrorBanner from '../components/ErrorBanner';
import SegmentedControl from '../components/SegmentedControl';
import Logo from '../components/Logo';
import { confirmarDestructivo } from '../utils/confirm';

const MODO_OPTIONS = [
  { label: 'Crear grupo', value: 'crear' },
  { label: 'Unirme con código', value: 'unirse' },
];

export default function GroupSetupScreen() {
  const { crearGrupo, unirseGrupo, logout, codigoPendiente } = useAuth();
  const insets = useSafeAreaInsets();
  // Si la persona escribió un código en el Login antes de crear su cuenta, arranca en "Unirme" con el código cargado.
  const [modo, setModo] = useState(codigoPendiente ? 'unirse' : 'crear');

  const [nombre, setNombre] = useState('');
  const [nombreError, setNombreError] = useState(false);

  const [codigo, setCodigo] = useState(codigoPendiente || '');
  const [codigoError, setCodigoError] = useState(false);

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo);
    setFormError('');
  }

  async function handleCrearGrupo() {
    if (!nombre.trim()) {
      setNombreError(true);
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      // crearGrupo() hace POST /api/familia/grupo y actualiza `grupo` en
      // AuthContext (si el grupo ya existe, lo recupera con GET en vez de
      // mostrar error). Al actualizarse `grupo`, App.js cambia a MainTabs
      // automáticamente — no se navega manualmente desde acá.
      await crearGrupo(nombre.trim());
    } catch (err) {
      setFormError(err.mensaje);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnirseGrupo() {
    if (!codigo.trim()) {
      setCodigoError(true);
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      // Mismo patrón que crearGrupo — al actualizarse `grupo` en
      // AuthContext, App.js cambia a MainTabs automáticamente.
      await unirseGrupo(codigo.trim());
    } catch (err) {
      setFormError(err.mensaje);
    } finally {
      setSaving(false);
    }
  }

  function confirmarSalida() {
    confirmarDestructivo(
      CERRAR_SESION.titulo,
      CERRAR_SESION.mensaje,
      logout,
      CERRAR_SESION.boton,
      'logout'
    );
  }

  const esCrear = modo === 'crear';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>
          <View style={styles.brand}>
            <Logo variante="terracota" size={72} style={styles.brandLogo} />
            <Text style={styles.brandTitle} accessibilityLabel="DOMUS+">
              DOMUS+
            </Text>
            <Text style={styles.brandSubtitle} accessibilityRole="header">
              {esCrear ? 'Creá tu grupo familiar' : 'Unite a un grupo familiar'}
            </Text>
            <Text style={styles.brandHelp}>
              {esCrear
                ? 'Acá vas a reunir a las personas y mascotas que querés cuidar.'
                : 'Pedile a quien te invitó el código de su grupo familiar.'}
            </Text>
          </View>

          <SegmentedControl
            options={MODO_OPTIONS}
            selectedValue={modo}
            onChange={cambiarModo}
            style={styles.segmented}
          />

          <View style={styles.card}>
            {esCrear ? (
              <FormField
                label="Nombre del grupo"
                value={nombre}
                onChangeText={(text) => {
                  setNombre(text);
                  if (text.trim()) setNombreError(false);
                }}
                placeholder="Familia Pérez"
                error={nombreError ? 'Escribí un nombre para el grupo.' : ''}
                returnKeyType="go"
                onSubmitEditing={handleCrearGrupo}
                style={{ paddingBottom: 0 }}
              />
            ) : (
              <FormField
                label="Código de invitación"
                value={codigo}
                onChangeText={(text) => {
                  setCodigo(text.toUpperCase());
                  if (text.trim()) setCodigoError(false);
                }}
                placeholder="ABC1234"
                autoCapitalize="characters"
                error={codigoError ? 'Escribí el código que te pasaron.' : ''}
                returnKeyType="go"
                onSubmitEditing={handleUnirseGrupo}
                style={{ paddingBottom: 0 }}
              />
            )}

            <ErrorBanner message={formError} />

            <View style={styles.submit}>
              <PrimaryButton
                title={esCrear ? 'Crear grupo' : 'Unirme al grupo'}
                variant="accent"
                onPress={esCrear ? handleCrearGrupo : handleUnirseGrupo}
                loading={saving}
              />
            </View>
          </View>

          <View style={styles.exit}>
            <Text style={styles.exitText}>¿No era esta cuenta?</Text>
            <PrimaryButton
              title="Cerrar sesión"
              variant="secondary"
              onPress={confirmarSalida}
              disabled={saving}
            />
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
    paddingHorizontal: 24,
  },
  column: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandLogo: { marginBottom: 8 },
  brandTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: poppinsWeight('700'),
    color: colors.accentStrong,
  },
  brandSubtitle: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: poppinsWeight('700'),
    color: colors.ink,
    marginTop: 8,
    textAlign: 'center',
  },
  brandHelp: {
    fontSize: 17,
    lineHeight: 25,
    color: colors.textBody,
    marginTop: 8,
    textAlign: 'center',
  },
  segmented: {
    width: '100%',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 16,
  },
  card: {
    width: '100%',
    backgroundColor: colors.glass,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    padding: 32,
    ...glassShadow,
  },
  submit: {
    marginTop: 24,
  },
  exit: {
    marginTop: 32,
    gap: 12,
    alignItems: 'center',
  },
  exitText: {
    fontSize: 16,
    color: colors.textBody,
  },
});
