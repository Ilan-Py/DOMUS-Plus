import AsyncStorage from '@react-native-async-storage/async-storage';

// Copia local de lo mínimo para ver una ficha de emergencia sin conexión (EME-01, docs/ux/02-auditoria.md):
// la lista de integrantes y mascotas (trae tipo de sangre, alergias y notas) y los contactos de cada integrante.
// Se guarda en el dispositivo de quien tiene la sesión y se borra al cerrar sesión (session.clearSession).
// No se usa para nada más: con conexión, siempre manda el servidor.
const PREFIJO = 'domus_cache:';

export async function guardarCache(clave, datos) {
  try {
    await AsyncStorage.setItem(PREFIJO + clave, JSON.stringify({ datos, guardado_en: new Date().toISOString() }));
  } catch (err) {
    console.warn('guardarCache=', err.message);
  }
}

// Devuelve { datos, guardadoEn: Date } o null si no hay copia.
export async function leerCache(clave) {
  try {
    const crudo = await AsyncStorage.getItem(PREFIJO + clave);
    if (!crudo) return null;
    const { datos, guardado_en: guardadoEn } = JSON.parse(crudo);
    return { datos, guardadoEn: new Date(guardadoEn) };
  } catch (err) {
    console.warn('leerCache=', err.message);
    return null;
  }
}

export async function borrarCache() {
  try {
    const claves = (await AsyncStorage.getAllKeys()).filter((c) => c.startsWith(PREFIJO));
    if (claves.length) await AsyncStorage.multiRemove(claves);
  } catch (err) {
    console.warn('borrarCache=', err.message);
  }
}

// Un error de red (sin respuesta del servidor) llega desde client.js sin `status`.
export function esErrorDeRed(err) {
  return !!err && err.status === undefined;
}

// «Sin conexión. Estás viendo la ficha guardada el sábado 28/11 a las 09:12.»
export function textoGuardadoEn(fecha) {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mi = String(fecha.getMinutes()).padStart(2, '0');
  return `el ${dias[fecha.getDay()]} ${dd}/${mm} a las ${hh}:${mi}`;
}
