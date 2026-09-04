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

// 2 — Desenvuelve { codigo, estado, datos } y normaliza errores
api.interceptors.response.use(
  (response) => response.data?.datos,
  async (error) => {
    const status = error.response?.status;

    // 401 = sin token, 403 = token inválido/expirado (config/auth.js) — ambos cierran sesión
    if (status === 401 || status === 403) {
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

export default api;
