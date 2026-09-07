import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// El JWT es una credencial portadora → SecureStore (Keychain/Keystore) en
// iOS/Android. expo-secure-store no está soportado en web (no hay Keychain/
// Keystore ahí) — se usa AsyncStorage como fallback solo para ese target,
// que es un tradeoff aceptable en dev, no una regresión de seguridad en
// los targets móviles reales.
const TOKEN_KEY = 'domus_token';
// El usuario/grupo no son secretos → AsyncStorage siempre, para poder
// mostrar datos en pantalla sin esperar un round-trip al arrancar la app.
const USER_KEY  = 'domus_usuario';
const GRUPO_KEY = 'domus_grupo';

const IS_WEB = Platform.OS === 'web';

export async function setToken(token) {
  if (IS_WEB) {
    return AsyncStorage.setItem(TOKEN_KEY, token);
  }
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function readToken() {
  if (IS_WEB) {
    return AsyncStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function removeToken() {
  if (IS_WEB) {
    return AsyncStorage.removeItem(TOKEN_KEY);
  }
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveSession({ token, usuario, grupo }) {
  await setToken(token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(usuario ?? null));
  await AsyncStorage.setItem(GRUPO_KEY, JSON.stringify(grupo ?? null));
}

export async function loadSession() {
  const [token, usuarioRaw, grupoRaw] = await Promise.all([
    readToken(),
    AsyncStorage.getItem(USER_KEY),
    AsyncStorage.getItem(GRUPO_KEY),
  ]);

  return {
    token: token ?? null,
    usuario: usuarioRaw ? JSON.parse(usuarioRaw) : null,
    grupo: grupoRaw ? JSON.parse(grupoRaw) : null,
  };
}

export async function clearSession() {
  await removeToken();
  await AsyncStorage.multiRemove([USER_KEY, GRUPO_KEY]);
}

export async function getToken() {
  return readToken();
}
