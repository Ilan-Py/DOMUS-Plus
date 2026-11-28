import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getList } from '../api/client';
import { useAuth } from './AuthContext';
import { guardarCache, leerCache, esErrorDeRed } from '../utils/cacheLocal';

const FamilyContext = createContext(null);

// Debe montarse dentro del árbol autenticado (después de que AuthContext
// confirme sesión) — asume que ya existe un token válido.
export function FamilyProvider({ children }) {
  const { sinConexion, reconectar } = useAuth();
  const [integrantes, setIntegrantes] = useState([]);
  const [mascotas, setMascotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Fecha de la copia local que se está mostrando porque no hay conexión (EME-01); null con datos frescos.
  const [desdeCache, setDesdeCache] = useState(null);
  // refresh() se llama después de cada alta/edición/baja (AddMemberScreen,
  // handleEliminar acá abajo), no sólo al montar — sin este guard, cada una
  // de esas mutaciones tapaba la lista ya visible con el skeleton completo
  // de nuevo. Sólo el primer load real (o un refresh que falló y nunca
  // llegó a tener datos) debe mostrar el skeleton entero.
  const hasLoadedOnceRef = useRef(false);

  async function refresh() {
    if (!hasLoadedOnceRef.current) setLoading(true);
    setError(null);
    try {
      const [datosIntegrantes, datosMascotas] = await Promise.all([
        getList('/api/familia/integrantes'),
        getList('/api/familia/mascotas'),
      ]);
      setIntegrantes(datosIntegrantes);
      setMascotas(datosMascotas);
      setDesdeCache(null);
      hasLoadedOnceRef.current = true;
      guardarCache('familia', { integrantes: datosIntegrantes, mascotas: datosMascotas });
      if (sinConexion) reconectar();
      // Los contactos de emergencia de cada integrante también quedan guardados, para que la ficha de
      // cualquiera se pueda abrir sin conexión aunque nunca se haya entrado antes. En segundo plano, sin esperar.
      datosIntegrantes.forEach((i) => {
        getList(`/api/familia/integrantes/${i.id}/contactos-emergencia`)
          .then((c) => guardarCache(`contactos:${i.id}`, c))
          .catch(() => {});
      });
    } catch (err) {
      // Sin red: mostrar la última copia guardada en vez de una familia vacía.
      const copia = esErrorDeRed(err) ? await leerCache('familia') : null;
      if (copia) {
        if (!hasLoadedOnceRef.current) {
          setIntegrantes(copia.datos.integrantes || []);
          setMascotas(copia.datos.mascotas || []);
        }
        setDesdeCache(copia.guardadoEn);
      } else {
        setError(err.mensaje);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const value = { integrantes, mascotas, loading, error, refresh, desdeCache };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error('useFamily debe usarse dentro de un FamilyProvider.');
  }
  return ctx;
}
