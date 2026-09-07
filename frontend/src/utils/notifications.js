import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseFechaHora } from './displayFormat';

const TIPO_LABELS = { vacuna: 'Vacuna', control: 'Control', medicacion: 'Medicación' };

const STORAGE_KEY = 'notificaciones_programadas';

// Un solo blob JSON { [recordatorioId]: notificationId } en vez de una key
// de AsyncStorage por recordatorio — el id que arma expo-notifications no
// tiene relación con recordatorio.id, así que hay que guardar el mapeo para
// poder cancelar más tarde.
async function leerMapa() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function guardarMapa(mapa) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapa));
}

// expo-notifications no tiene programación local en web — su
// NotificationScheduler.js (fallback no-nativo, confirmado leyendo el
// paquete instalado) sólo expone addListener/removeListeners, sin
// scheduleNotificationAsync. Cortar acá evita pedirle permiso de
// notificaciones al navegador para una función que después no puede andar,
// y evita depender de que el try/catch de cada caller trague el
// UnavailabilityError resultante.
function soportaProgramacionLocal() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

// Android 13+ dispara el prompt nativo de POST_NOTIFICATIONS automáticamente
// la primera vez que se crea un canal (setNotificationChannelAsync) — no
// hace falta pedirlo aparte. iOS sí necesita el prompt explícito de acá.
export async function pedirPermisos() {
  if (!soportaProgramacionLocal()) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('recordatorios', {
      name: 'Recordatorios',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  // En simulador/emulador expo-notifications puede comportarse raro
  // (permisos que nunca se resuelven, etc.) — Device.isDevice filtra eso.
  if (!Device.isDevice) return false;

  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;

  const pedido = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: true },
  });
  return pedido.granted;
}

// Programa una notificación local para fecha_hora. Si no hay permiso
// concedido, no programa nada (el recordatorio igual queda guardado como
// entrada de calendario vía el POST normal — no bloquea el guardado).
export async function programarNotificacion(recordatorio) {
  if (!soportaProgramacionLocal()) return null;
  const concedido = await pedirPermisos();
  if (!concedido) return null;

  const fecha = parseFechaHora(recordatorio.fecha_hora);
  if (Number.isNaN(fecha.getTime()) || fecha <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: TIPO_LABELS[recordatorio.tipo] ?? recordatorio.tipo,
      body: recordatorio.descripcion || 'Tenés un recordatorio pendiente.',
      data: { recordatorioId: recordatorio.id },
    },
    // Pasar el Date directo (no un objeto { type, date }) — la versión de
    // expo-notifications fijada por este SDK (0.28.x) detecta un trigger de
    // fecha vía `instanceof Date` (ver scheduleNotificationAsync.js:
    // isDateTrigger/parseDateTrigger), no vía SchedulableTriggerInputTypes
    // (API de una versión más nueva que no existe acá).
    trigger: fecha,
  });

  const mapa = await leerMapa();
  mapa[recordatorio.id] = id;
  await guardarMapa(mapa);
  return id;
}

// Sincroniza las notificaciones locales de ESTE dispositivo con la lista de
// recordatorios del grupo tal como la devolvió el backend. Necesario desde
// que los recordatorios son compartidos por grupo (no por usuario): este
// dispositivo puede tener que notificar por un recordatorio que otro
// integrante creó, algo que antes nunca pasaba (antes cada quien sólo
// programaba lo que él mismo creaba/editaba, vía programarNotificacion
// llamado directo desde AddReminderScreen al guardar). Se llama en cada
// fetch de CalendarScreen.
//
// Alcance deliberadamente acotado: sólo agrega lo que falta y cancela lo que
// ya no es vigente (eliminado/desactivado/vencido). Si otro integrante EDITA
// la fecha_hora de un recordatorio que este dispositivo ya tenía programado,
// acá no se detecta el cambio (no se guarda una "huella" de fecha_hora por
// recordatorio) — este dispositivo mantiene la notificación en el horario
// viejo hasta que la reprograme quien lo editó. Cubrir ese caso cruzado
// pedía guardar y comparar fecha_hora por id además del id de notificación,
// que es más estado del que esta pasada necesita — se deja documentado en
// vez de resuelto en silencio.
export async function sincronizarNotificaciones(recordatorios) {
  if (!soportaProgramacionLocal()) return;
  const concedido = await pedirPermisos();
  if (!concedido) return;

  const mapa = await leerMapa();
  const vigentesIds = new Set();

  for (const r of recordatorios) {
    if (!r.activo) continue;
    const fecha = parseFechaHora(r.fecha_hora);
    if (Number.isNaN(fecha.getTime()) || fecha <= new Date()) continue;

    vigentesIds.add(String(r.id));
    if (mapa[r.id]) continue; // ya programada en este dispositivo

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: TIPO_LABELS[r.tipo] ?? r.tipo,
        body: r.descripcion || 'Tenés un recordatorio pendiente.',
        data: { recordatorioId: r.id },
      },
      trigger: fecha,
    });
    mapa[r.id] = id;
  }

  // Cancela programaciones huérfanas — recordatorios que ya no están
  // vigentes y que este dispositivo nunca se enteró de cancelar (por
  // ejemplo, otro integrante los eliminó/desactivó desde el suyo).
  for (const idRecordatorio of Object.keys(mapa)) {
    if (!vigentesIds.has(idRecordatorio)) {
      await Notifications.cancelScheduledNotificationAsync(mapa[idRecordatorio]).catch(() => {});
      delete mapa[idRecordatorio];
    }
  }

  await guardarMapa(mapa);
}

export async function cancelarNotificacion(recordatorioId) {
  if (!soportaProgramacionLocal()) return;
  const mapa = await leerMapa();
  const id = mapa[recordatorioId];
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id);
  delete mapa[recordatorioId];
  await guardarMapa(mapa);
}
