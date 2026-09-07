import { Alert, Platform } from 'react-native';

// Alert.alert es un no-op en react-native-web (ver
// node_modules/react-native-web/dist/exports/Alert/index.js — static
// alert() {}, sin cuerpo). Cualquier confirmación destructiva de la app
// debe pasar por acá en vez de llamar Alert.alert directo, o el botón
// simplemente no hace nada en web, sin ningún error visible. En native
// (donde Alert.alert sí funciona) el comportamiento no cambia.
export function confirmarDestructivo(titulo, mensaje, onConfirmar, textoConfirmar = 'Eliminar') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensaje}`)) onConfirmar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoConfirmar, style: 'destructive', onPress: onConfirmar },
  ]);
}

// Menú de opciones no-destructivas (ej. "Tomar foto"/"Elegir de galería"/
// "Elegir PDF" en AttachmentsSection) — no existía un equivalente a
// confirmarDestructivo para este caso (ninguna opción es "peligrosa", así
// que un solo botón rojo no tiene sentido acá). `opciones` es
// [{ text, value }]; se llama a `onElegir(value)` con la elegida.
// Alert.alert soporta hasta 3 botones nativos de forma prolija — con más de
// eso conviene un ActionSheet real, pero AttachmentsSection sólo necesita 3.
// En web no hay ningún equivalente nativo de un menú de N botones (ver nota
// de confirmarDestructivo sobre window.confirm) — window.prompt numerado es
// el mismo nivel de fallback "no crashea, no es lindo" que ya se usa ahí.
export function elegirOpcion(titulo, opciones, onElegir) {
  if (Platform.OS === 'web') {
    const lista = opciones.map((o, i) => `${i + 1}) ${o.text}`).join('\n');
    const respuesta = window.prompt(`${titulo}\n\n${lista}\n\nEscribí el número de la opción:`);
    const indice = parseInt(respuesta, 10) - 1;
    if (opciones[indice]) onElegir(opciones[indice].value);
    return;
  }
  Alert.alert(titulo, undefined, [
    ...opciones.map((o) => ({ text: o.text, onPress: () => onElegir(o.value) })),
    { text: 'Cancelar', style: 'cancel' },
  ]);
}
