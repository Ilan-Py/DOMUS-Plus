import { openDialog } from '../components/DialogHost';

// Confirmaciones y menús de opciones. Antes usaban Alert.alert (no-op en
// react-native-web) y window.confirm/prompt como fallback en web, que se ven
// distinto en cada navegador y el prompt pedía escribir un número. Ahora todo
// pasa por DialogHost: el mismo diálogo, con botones grandes, en web y nativo.

// Acción destructiva: botón rojo-terracota con la acción explícita arriba y
// "No, volver" abajo.
export function confirmarDestructivo(titulo, mensaje, onConfirmar, textoConfirmar = 'Eliminar', variante = 'danger') {
  openDialog({
    variante, // 'danger' (tacho), 'logout' (puerta) o 'info': ver components/ConfirmModal.js
    title: titulo,
    message: mensaje,
    actions: [
      { label: `Sí, ${textoConfirmar.toLowerCase()}`, variant: 'accent', onPress: onConfirmar },
      { label: 'No, volver', variant: 'secondary' },
    ],
  });
}

// Menú de opciones no destructivas (ej. "Tomar foto"/"Elegir de galería"/
// "Elegir PDF"). `opciones` es [{ text, value }]; se llama a `onElegir(value)`.
export function elegirOpcion(titulo, opciones, onElegir) {
  openDialog({
    title: titulo,
    actions: [
      ...opciones.map((o) => ({
        label: o.text,
        variant: 'secondary',
        onPress: () => onElegir(o.value),
      })),
      { label: 'Cancelar', variant: 'secondary' },
    ],
  });
}

// Elegir entre pocas opciones grandes (con ícono). `tarjetas` es
// [{ label, hint, icon, bg, fg, value }]; se llama a `onElegir(value)` con la elegida.
export function elegirTarjetas(titulo, tarjetas, onElegir) {
  openDialog({
    title: titulo,
    cards: tarjetas.map((t) => ({ ...t, onPress: () => onElegir(t.value) })),
  });
}
