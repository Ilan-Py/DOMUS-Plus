import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { setUnauthorizedHandler } from '../api/client';
import {
  saveSession,
  loadSession,
  clearSession,
  setToken as persistToken,
  setRecordarSesion,
  guardarGrupo,
} from '../api/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [grupo, setGrupo] = useState(null);
  const [booting, setBooting] = useState(true);
  // Código de invitación escrito antes de tener cuenta (Login → "Unirme con un código"): se guarda
  // en memoria y GroupSetupScreen lo usa para precargar el paso de unirse al grupo.
  const [codigoPendiente, setCodigoPendiente] = useState('');
  // true cuando la app arrancó sin poder confirmar el grupo con el servidor y usa el guardado (EME-01).
  // Las pantallas que leen datos lo combinan con su propia copia local (utils/cacheLocal.js).
  const [sinConexion, setSinConexion] = useState(false);

  function resetState() {
    setToken(null);
    setUsuario(null);
    setGrupo(null);
    setSinConexion(false);
  }

  // Lo llaman las pantallas cuando una carga vuelve a andar: confirma el grupo y apaga el aviso.
  async function reconectar() {
    try {
      const datosGrupo = await api.get('/api/familia/grupo');
      setGrupo(datosGrupo);
      guardarGrupo(datosGrupo);
      setSinConexion(false);
      return true;
    } catch (err) {
      if (err.status === 404) {
        // El servidor dice que ya no tiene grupo (la quitaron mientras estaba sin red).
        await guardarGrupo(null);
        setGrupo(null);
        setSinConexion(false);
        return true;
      }
      return false;
    }
  }

  async function logout() {
    await clearSession();
    resetState();
    setCodigoPendiente('');
  }

  // 1 — Rehidratar sesión al arrancar y resolver si falta onboarding (grupo)
  useEffect(() => {
    let activo = true;

    async function rehidratar() {
      let sesion;
      try {
        sesion = await loadSession();
      } catch (err) {
        // Un fallo de lectura de almacenamiento no debe dejar la app
        // atascada en el splash — se trata como "sin sesión".
        console.warn('AuthContext.rehidratar (loadSession):', err.message);
        if (activo) setBooting(false);
        return;
      }

      if (!sesion.token) {
        if (activo) setBooting(false);
        return;
      }

      if (activo) {
        setToken(sesion.token);
        setUsuario(sesion.usuario);
      }

      try {
        const datosGrupo = await api.get('/api/familia/grupo');
        if (activo) setGrupo(datosGrupo);
        guardarGrupo(datosGrupo);
      } catch (err) {
        // 404 = el usuario aún no creó un grupo familiar (no es un error de sesión).
        // Cualquier otro error (sin red, servidor caído) NO significa que no tenga familia: se usa el grupo
        // guardado en el dispositivo y se avisa que falta conexión, en vez de mandarla a «Creá tu grupo» (EME-01).
        if (activo && err.status !== 404) {
          console.warn('AuthContext.rehidratar:', err.mensaje);
          if (err.status !== 401 && sesion.grupo) {
            setGrupo(sesion.grupo);
            setSinConexion(true);
          }
        }
      } finally {
        if (activo) setBooting(false);
      }
    }

    rehidratar();
    return () => { activo = false; };
  }, []);

  // 2 — Registrar el handler de 401/403 una sola vez.
  // client.js ya llama clearSession() antes de disparar este evento;
  // logout() la vuelve a invocar pero es idempotente (borra claves inexistentes).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
  }, []);

  async function login(email, password, recordar = true) {
    const datos = await api.post('/api/auth/login', { email, password });
    await setRecordarSesion(recordar);

    // Persistir el token ANTES de pedir el grupo — el interceptor de
    // client.js lee el token desde SecureStore/AsyncStorage en cada
    // request (getToken() -> readToken()), no de un estado en memoria.
    // Pedir /api/familia/grupo antes de este await salía sin Authorization
    // (nada persistido todavía) y el backend respondía 403 "Token no
    // proporcionado" — silencioso porque grupoActual quedaba en null y el
    // catch de abajo sólo logueaba un warning.
    await persistToken(datos.token);

    let grupoActual = null;
    try {
      grupoActual = await api.get('/api/familia/grupo');
    } catch (err) {
      // 404 = el usuario aún no creó un grupo familiar (no es un error de sesión)
      if (err.status !== 404) {
        console.warn('AuthContext.login (grupo):', err.mensaje);
      }
    }

    await saveSession({ token: datos.token, usuario: datos.usuario, grupo: grupoActual });
    setToken(datos.token);
    setUsuario(datos.usuario);
    setGrupo(grupoActual);
    return datos;
  }

  // authController.registrar no devuelve token (CU1) — encadena login con las mismas credenciales
  async function register(payload) {
    await api.post('/api/auth/registrar', payload);
    return login(payload.email, payload.password);
  }

  // 409 = el usuario ya pertenece a un grupo (grupo_miembro es UNIQUE por
  // usuario_id — un usuario a lo sumo en un grupo activo a la vez) — se
  // trata como éxito: se recupera el grupo existente en vez de mostrar un error.
  async function crearGrupo(nombre) {
    try {
      const datos = await api.post('/api/familia/grupo', { nombre });
      setGrupo(datos);
      guardarGrupo(datos);
      return datos;
    } catch (err) {
      if (err.status === 409) {
        const datosExistente = await api.get('/api/familia/grupo');
        setGrupo(datosExistente);
        guardarGrupo(datosExistente);
        return datosExistente;
      }
      throw err;
    }
  }

  // Unirse no devuelve el grupo directo (POST /grupo/unirse sólo confirma la
  // membresía) — se pide GET /grupo aparte para tener {id, nombre,
  // created_at} y actualizar `grupo`, mismo shape que crearGrupo/login.
  async function unirseGrupo(codigo) {
    await api.post('/api/familia/grupo/unirse', { codigo });
    const datosGrupo = await api.get('/api/familia/grupo');
    setGrupo(datosGrupo);
    guardarGrupo(datosGrupo);
    setCodigoPendiente('');
    return datosGrupo;
  }

  // Deja el grupo (no cierra sesión) — token/usuario se conservan, sólo
  // `grupo` pasa a null. App.js reacciona igual que con crearGrupo/logout:
  // al quedar sin `grupo`, RootNavigator vuelve a mostrar GroupSetupScreen
  // (fase 'onboarding') en vez de MainTabs. Se persiste el `grupo: null`
  // acá mismo — si no, un reinicio de la app antes del próximo login
  // volvería a leer el grupo viejo desde AsyncStorage.
  async function salirDelGrupo() {
    await api.post('/api/familia/grupo/salir');
    await saveSession({ token, usuario, grupo: null });
    setGrupo(null);
  }

  // Actualiza `usuario` en memoria y en AsyncStorage — sin esto, el nombre
  // nuevo se ve en pantalla hasta el próximo reinicio de la app pero un
  // reload leería el valor viejo desde loadSession().
  async function actualizarPerfil(payload) {
    const datos = await api.patch('/api/auth/perfil', payload);
    await saveSession({ token, usuario: datos, grupo });
    setUsuario(datos);
    return datos;
  }

  // Mismo motivo que actualizarPerfil: persistir el nuevo nombre de grupo,
  // no sólo actualizar el estado en memoria.
  async function renombrarGrupo(nombre) {
    const datos = await api.patch('/api/familia/grupo', { nombre });
    await saveSession({ token, usuario, grupo: datos });
    setGrupo(datos);
    return datos;
  }

  const value = {
    token, usuario, grupo, booting, codigoPendiente, setCodigoPendiente, sinConexion, reconectar,
    login, register, crearGrupo, unirseGrupo, salirDelGrupo, logout,
    actualizarPerfil, renombrarGrupo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider.');
  }
  return ctx;
}
