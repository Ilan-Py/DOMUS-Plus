import axios from 'axios';
import { API_URL } from '../config/env';
import { getToken, clearSession } from './session';

// Handler inyectado por AuthContext para reaccionar a una sesión expirada
// sin que este módulo dependa de React ni de la navegación.
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// 1 — Adjunta el JWT en cada request protegido
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// El backend (Prisma) responde con claves camelCase (fechaHora, grupoId,
// fechaNacimiento...) pero las pantallas leen snake_case (fecha_hora,
// grupo_id...). Sin esto, por ejemplo, CalendarScreen recibía `undefined`
// en fecha_hora y se caía al renderizar. Se agrega el alias snake_case junto
// a cada clave camelCase, sin quitar la original, para que ambos nombres
// funcionen.
function withSnakeAliases(value) {
  if (Array.isArray(value)) return value.map(withSnakeAliases);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      const converted = withSnakeAliases(val);
      out[key] = converted;
      const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      if (snake !== key && !(snake in value)) out[snake] = converted;
    }
    return out;
  }
  return value;
}

// 2 — Desenvuelve { codigo, estado, datos } y normaliza errores
api.interceptors.response.use(
  (response) => withSnakeAliases(response.data?.datos),
  async (error) => {
    const status = error.response?.status;

    // 401 = sin token o token inválido/expirado (config/auth.js) → sesión
    // muerta, hay que cerrarla. 403 = autenticado pero sin permiso para ESTA
    // acción puntual (ej. un 'miembro' pegándole a un endpoint owner-only de
    // grupo compartido) — la sesión sigue siendo válida, así que NO debe
    // deslogear. Antes ambos códigos se trataban igual porque ningún
    // endpoint emitía 403 todavía; ahora que los endpoints owner-only de
    // grupo_miembro sí lo hacen, tratarlo como 401 desloguearía a un
    // 'miembro' legítimo por intentar una acción que no le corresponde.
    if (status === 401) {
      await clearSession();
      onUnauthorized();
    }

    const data = error.response?.data;
    const mensaje =
      data?.estado === 'error' && typeof data.datos === 'string'
        ? data.datos
        : 'No se pudo conectar con el servidor.';

    return Promise.reject({ status, mensaje });
  }
);

// Wrapper para endpoints de lista — garantiza un array incluso si `datos`
// viene ausente/no-array (contrato roto o respuesta inesperada), en vez de
// dejar que cada consumidor asuma `.length`/`.map`/`.forEach` sobre lo que
// sea que haya devuelto el interceptor. No se toca el interceptor en sí
// porque no puede distinguir "lista" de "recurso único" (un `datos` de
// recurso único no debe coercionarse a []).
export async function getList(url, config) {
  const datos = await api.get(url, config);
  return Array.isArray(datos) ? datos : [];
}

export default api;
