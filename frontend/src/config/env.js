import { Platform } from 'react-native';

// Backend DOMUS+ corre en el puerto 3000 (backend/.env.example → PORT=3000)

// Platform.OS no distingue emulador/simulador de dispositivo físico.
// Para probar en un dispositivo físico con Expo Go, reemplazar API_URL abajo
// por la IP LAN de la máquina donde corre el backend (ej: 'http://192.168.1.100:3000').
const LAN_IP_URL = 'http://192.168.0.8:3000';
const USE_LAN_IP = false; // true → fuerza LAN_IP_URL (dispositivo físico)

function resolveApiUrl() {
  // El bundler web corre en la misma máquina que el backend — nunca debe
  // pasar por la IP LAN ni por USE_LAN_IP (eso es solo para dispositivos
  // físicos Android/iOS). Se resuelve primero y corta el resto de la lógica.
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  if (USE_LAN_IP) return LAN_IP_URL;

  if (Platform.OS === 'android') {
    // Emulador Android: 10.0.2.2 apunta al localhost de la máquina host
    return 'http://10.0.2.2:3000';
  }
  if (Platform.OS === 'ios') {
    // Simulador iOS comparte el localhost de la máquina host
    return 'http://localhost:3000';
  }
  return LAN_IP_URL;
}

export const API_URL = resolveApiUrl();
