import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Backend DOMUS+ corre en el puerto 3000 (backend/.env.example → PORT=3000)
//
// Fuente de verdad de estos valores: app.json → expo.extra, leído acá vía
// expo-constants (Constants.expoConfig.extra). Ya no son constantes
// hardcodeadas en este archivo — para cambiar el host LAN, forzar el
// override de dispositivo físico, o fijar el host de producción, se edita
// app.json, no este archivo.
const extra = Constants.expoConfig?.extra ?? {};
const LAN_IP_URL = extra.apiUrlLan;
const USE_LAN_IP = extra.useLanIp;

// Platform.OS no distingue emulador/simulador de dispositivo físico.
// Para probar en un dispositivo físico con Expo Go, poner useLanIp:true en
// app.json (o apiUrlLan a la IP LAN correcta de la máquina del backend).
function resolveApiUrl() {
  // Fuera de desarrollo (build de producción) usa el host fijo de app.json,
  // nunca la lógica de emulador/LAN de abajo — esa es sólo para dev.
  if (!__DEV__) {
    return extra.apiUrlProd;
  }

  // El bundler web corre en la misma máquina que el backend — nunca debe
  // pasar por la IP LAN ni por USE_LAN_IP (eso es solo para dispositivos
  // físicos Android/iOS). Se resuelve primero y corta el resto de la lógica.
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  if (USE_LAN_IP) return LAN_IP_URL;

  if (Platform.OS === 'android') {
    // Dispositivo físico por USB (adb reverse tcp:3000 tcp:3000 reenvía este
    // puerto a la PC) — 10.0.2.2 es un alias especial que sólo existe en la
    // red virtual del emulador, no significa nada en hardware real. El
    // emulador sigue usando 10.0.2.2, que sí apunta al localhost de la máquina host.
    return Device.isDevice ? 'http://localhost:3000' : 'http://10.0.2.2:3000';
  }
  if (Platform.OS === 'ios') {
    // Simulador iOS comparte el localhost de la máquina host
    return 'http://localhost:3000';
  }
  return LAN_IP_URL;
}

export const API_URL = resolveApiUrl();

// El JWT va en el header Authorization de cada request protegido (ver
// api/client.js) — sobre HTTP viaja en texto plano. Fuera de desarrollo esto
// no debe pasar nunca; falla ruidoso en vez de dejarlo pasar en silencio.
if (!__DEV__ && !API_URL?.startsWith('https://')) {
  throw new Error(
    `API_URL de producción debe ser HTTPS (JWT viaja en cada request). Valor actual: ${API_URL}`
  );
}
