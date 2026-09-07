import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { colors, radii, shadow } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import { layout } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import ErrorBanner from '../components/ErrorBanner';
import SegmentedControl from '../components/SegmentedControl';

const MODO_OPTIONS = [
  { label: 'Crear grupo', value: 'crear' },
  { label: 'Unirme con código', value: 'unirse' },
];

export default function GroupSetupScreen() {
  const { crearGrupo, unirseGrupo } = useAuth();
  const [modo, setModo] = useState('crear');

  const [nombre, setNombre] = useState('');
  const [nombreError, setNombreError] = useState(false);

  const [codigo, setCodigo] = useState('');
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

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.authWrap}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkIcon}>⚭</Text>
            </View>
            <Text style={styles.brandTitle}>
              {modo === 'crear' ? 'Crea tu grupo familiar' : 'Unite a un grupo familiar'}
            </Text>
            <Text style={styles.brandSubtitle}>
              {modo === 'crear'
                ? 'Aquí reunirás a las personas y mascotas que quieres cuidar.'
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
            {modo === 'crear' ? (
              <>
                <FormField
                  label="Nombre del grupo"
                  value={nombre}
                  onChangeText={(text) => {
                    setNombre(text);
                    if (text.trim()) setNombreError(false);
                  }}
                  placeholder="Familia Pérez"
                  error={nombreError ? 'Este campo es obligatorio' : ''}
                  style={{ paddingBottom: 0 }}
                />

                <ErrorBanner message={formError} />

                <View style={styles.formSubmit}>
                  <PrimaryButton
                    title="Crear grupo"
                    onPress={handleCrearGrupo}
                    loading={saving}
                    variant="success"
                  />
                </View>
              </>
            ) : (
              <>
                <FormField
                  label="Código de invitación"
                  value={codigo}
                  onChangeText={(text) => {
                    setCodigo(text.toUpperCase());
                    if (text.trim()) setCodigoError(false);
                  }}
                  placeholder="ABC1234"
                  autoCapitalize="characters"
                  error={codigoError ? 'Este campo es obligatorio' : ''}
                  style={{ paddingBottom: 0 }}
                />

                <ErrorBanner message={formError} />

                <View style={styles.formSubmit}>
                  <PrimaryButton
                    title="Unirme al grupo"
                    onPress={handleUnirseGrupo}
                    loading={saving}
                    variant="success"
                  />
                </View>
              </>
            )}
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
    paddingTop: layout.screenTopPadding,
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
    // Insignia decorativa de marca, mismo rol que brandBadge en LoginScreen
    // (que ya usa colors.lime/terracota) — no es un elemento de urgencia ni
    // de "estado secundario calmo", es la marca de la app en el onboarding,
    // así que sigue ese mismo precedente en vez de sage. Era colors.blueLight
    // (#9CC9FF), el último azul frío hardcodeado que quedaba sin migrar.
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...shadow,
  },
  brandMarkIcon: {
    fontSize: 22,
    color: colors.navy,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.navy,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 4,
    maxWidth: 240,
    textAlign: 'center',
  },
  segmented: {
    width: '100%',
    marginBottom: 14,
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
  formSubmit: {
    paddingTop: 6,
  },
});
