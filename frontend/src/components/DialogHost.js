import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PrimaryButton from './PrimaryButton';
import PressScale from './PressScale';
import ConfirmModal from './ConfirmModal';

// Diálogo propio de la app. Reemplaza window.confirm / window.prompt (web) y
// Alert.alert (nativo) para que se vea y se comporte igual en todos lados.
//
// Se monta una sola vez (App.js) y se abre con `openDialog` desde
// utils/confirm.js, así los call-sites existentes no cambian.
//
// Dos formas:
//  - `actions`: botones grandes, uno por línea (confirmaciones y menús simples).
//  - `cards`:   tarjetas grandes con ícono lado a lado (elegir entre pocas cosas).
//
// Animación sobria (Apple HIG): el diálogo aparece con opacidad 0→1 y escala
// 0,96→1 en 190ms (ease-out), y el fondo se oscurece suave. Sin rebotes, y sin
// movimiento si el sistema pide "reducir movimiento".
let listener = null;

export function openDialog(config) {
  if (listener) listener(config);
}

const DURACION = 190;
const CARD_HOVER = { borde: '#D97757', fondo: '#FCF8F3' };

// Tarjeta de opción: círculo con ícono, título y bajada. Hover (escritorio): borde
// terracota suave, fondo crema y sube 2px. Al tocar: escala 0,98 (lo hace PressScale).
function ChoiceCard({ card, onPress }) {
  const [hover, setHover] = useState(false);
  return (
    <View
      style={[
        styles.cardWrap,
        hover && styles.cardWrapHover,
        Platform.OS === 'web' && styles.cardWrapWeb,
      ]}
    >
      <PressScale
        style={styles.fill}
        contentStyle={[styles.choice, hover && styles.choiceHover]}
        onPress={onPress}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        accessibilityLabel={`${card.label}: ${card.hint}`}
      >
        <View style={[styles.choiceIcon, { backgroundColor: card.bg }]}>
          <Ionicons name={card.icon} size={38} color={card.fg} />
        </View>
        <Text style={styles.choiceTitle}>{card.label}</Text>
        <Text style={styles.choiceHint}>{card.hint}</Text>
      </PressScale>
    </View>
  );
}

export default function DialogHost() {
  const [dialog, setDialog] = useState(null);
  const { width } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;
  const [sinMovimiento, setSinMovimiento] = useState(false);

  useEffect(() => {
    listener = setDialog;
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSinMovimiento).catch(() => {});
  }, []);

  // Entrada del diálogo cada vez que se abre uno.
  useEffect(() => {
    if (!dialog) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: sinMovimiento ? 0 : DURACION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [dialog, anim, sinMovimiento]);

  function close(action) {
    setDialog(null);
    if (action) action();
  }

  if (!dialog) return null;

  // Confirmaciones con sticker (variante 'logout' | 'danger' | 'info'): la tarjeta es ConfirmModal, con su
  // propia entrada paper-pop; acá sólo se mantiene el mismo fondo con desenfoque y el cierre al tocar afuera.
  if (dialog.variante) {
    return (
      <Modal transparent animationType="none" visible onRequestClose={() => close()}>
        <Animated.View style={[styles.backdrop, Platform.OS === 'web' && styles.backdropWeb, { opacity: anim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => close()}
            accessible={false}
            importantForAccessibility="no"
            focusable={false}
          />
          <ConfirmModal
            variante={dialog.variante}
            titulo={dialog.title}
            mensaje={dialog.message}
            acciones={dialog.actions || []}
            onElegir={(a) => close(a.onPress)}
          />
        </Animated.View>
      </Modal>
    );
  }

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [sinMovimiento ? 1 : 0.96, 1] });
  const conTarjetas = !!dialog.cards;
  const tarjetasEnFila = width >= 520;

  return (
    <Modal transparent animationType="none" visible onRequestClose={() => close()}>
      <Animated.View style={[styles.backdrop, Platform.OS === 'web' && styles.backdropWeb, { opacity: anim }]}>
        {/* Tocar afuera cierra, pero oculto a lectores de pantalla: ya está el botón X. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => close()}
          accessible={false}
          importantForAccessibility="no"
          focusable={false}
        />
        <Animated.View
          style={[
            styles.card,
            conTarjetas && styles.cardWide,
            { opacity: anim, transform: [{ scale }] },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {dialog.title}
            </Text>
            {conTarjetas && (
              <PressScale contentStyle={styles.closeBtn} onPress={() => close()} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={26} color={colors.iconWarm} />
              </PressScale>
            )}
          </View>

          {!!dialog.message && <Text style={styles.message}>{dialog.message}</Text>}

          {conTarjetas ? (
            <>
              <View style={[styles.choices, tarjetasEnFila && styles.choicesRow]}>
                {dialog.cards.map((c) => (
                  <ChoiceCard key={c.label} card={c} onPress={() => close(c.onPress)} />
                ))}
              </View>
              <PressScale contentStyle={styles.cancelText} onPress={() => close()} accessibilityLabel="Cancelar">
                <Text style={styles.cancelLabel}>Cancelar</Text>
              </PressScale>
            </>
          ) : (
            <View style={styles.actions}>
              {dialog.actions.map((a) => (
                <PrimaryButton
                  key={a.label}
                  title={a.label}
                  variant={a.variant || 'secondary'}
                  onPress={() => close(a.onPress)}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42,36,33,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  // En web, además, un desenfoque leve del fondo.
  backdropWeb: { backdropFilter: 'blur(2px)' },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: 20,
  },
  cardWide: { maxWidth: 560 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: 20, lineHeight: 28, fontFamily: poppinsWeight('700'), color: colors.ink, paddingTop: 4 },
  closeBtn: { width: 48, height: 48, marginTop: -8, marginRight: -12, alignItems: 'center', justifyContent: 'center' },
  message: { fontSize: 17, lineHeight: 25, color: colors.textBody, marginTop: 8 },
  actions: { gap: 12, marginTop: 24 },

  // ---- tarjetas de opción
  choices: { gap: 16, marginTop: 16 },
  choicesRow: { flexDirection: 'row' },
  cardWrap: { flex: 1 },
  fill: { flex: 1 },
  cardWrapWeb: { transitionProperty: 'transform', transitionDuration: '150ms', transitionTimingFunction: 'ease-out' },
  cardWrapHover: { transform: [{ translateY: -2 }] },
  choice: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.glassStrong,
    minHeight: 48,
    flex: 1,
  },
  choiceHover: { borderColor: CARD_HOVER.borde, backgroundColor: CARD_HOVER.fondo },
  choiceIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  choiceTitle: { fontSize: 18, lineHeight: 26, fontFamily: poppinsWeight('700'), color: colors.ink, textAlign: 'center' },
  choiceHint: { fontSize: 15, lineHeight: 22, color: colors.textBody, textAlign: 'center', marginTop: 4 },
  cancelText: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  cancelLabel: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.textBody },
});
