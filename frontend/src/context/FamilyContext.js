import React, { createContext, useContext, useEffect, useState } from 'react';
import { getList } from '../api/client';

const FamilyContext = createContext(null);

// Debe montarse dentro del árbol autenticado (después de que AuthContext
// confirme sesión) — asume que ya existe un token válido.
export function FamilyProvider({ children }) {
  const [integrantes, setIntegrantes] = useState([]);
  const [mascotas, setMascotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [datosIntegrantes, datosMascotas] = await Promise.all([
        getList('/api/familia/integrantes'),
        getList('/api/familia/mascotas'),
      ]);
      setIntegrantes(datosIntegrantes);
      setMascotas(datosMascotas);
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
