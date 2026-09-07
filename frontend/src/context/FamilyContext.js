import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getList } from '../api/client';

const FamilyContext = createContext(null);

// Debe montarse dentro del árbol autenticado (después de que AuthContext
// confirme sesión) — asume que ya existe un token válido.
export function FamilyProvider({ children }) {
  const [integrantes, setIntegrantes] = useState([]);
  const [mascotas, setMascotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const value = { integrantes, mascotas, loading, error, refresh };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error('useFamily debe usarse dentro de un FamilyProvider.');
  }
  return ctx;
}
