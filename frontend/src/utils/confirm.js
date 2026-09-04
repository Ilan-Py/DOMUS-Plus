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
