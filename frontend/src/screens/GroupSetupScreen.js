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
import { colors, radii, shadow, buttonColors } from '../theme/colors';

export default function GroupSetupScreen({ navigation }) {
  const [nombre, setNombre] = useState('');

  function handleCrearGrupo() {
    // TODO: conectar con POST /api/familia/grupo
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
              <Text style={styles.brandMarkIcon}>⚭</Text>
            </View>
            <Text style={styles.brandTitle}>Crea tu grupo familiar</Text>
            <Text style={styles.brandSubtitle}>
              Aquí reunirás a las personas y mascotas que quieres cuidar.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.field, { paddingBottom: 0 }]}>
              <Text style={styles.label}>Nombre del grupo</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Familia Pérez"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.formSubmit}>
              <TouchableOpacity
                style={styles.btnSuccess}
                onPress={handleCrearGrupo}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>Crear grupo</Text>
              </TouchableOpacity>
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
    fontSize: 22,
    color: colors.navy,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
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
  btnSuccess: {
    width: '100%',
    minHeight: 48,
    borderRadius: radii.button,
    backgroundColor: buttonColors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
