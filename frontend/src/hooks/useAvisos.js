import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getList } from '../api/client';
import { parseApiDate } from '../utils/displayFormat';
import { prepararAvisos } from '../utils/avisos';

// Recordatorios del grupo, recargados cada vez que la pantalla toma el foco.
//  - `avisos`: sólo los pendientes (lo que usan los contadores, la semana y las tarjetas). null mientras carga.
//  - `todos`: también los ya marcados, para «Hoy» (lo marcado hoy queda a la vista y se puede deshacer).
//  - `actualizar(id, cambios)`: cambio en el acto (interfaz optimista); `actualizar(id, null)` lo deja como estaba.
//  - `error`: true si la última carga falló (la pantalla no debe decir «nada pendiente» en ese caso).
export default function useAvisos() {
  const [todos, setTodos] = useState(null);
  const [error, setError] = useState(false);
  const previos = useRef({});

  const recargar = useCallback(async () => {
    try {
      setTodos(prepararAvisos(await getList('/api/recordatorios'), { todos: true }));
      previos.current = {};
      setError(false);
    } catch {
      setError(true);
      setTodos((antes) => antes || []);
    }
  }, []);

  const actualizar = useCallback((id, cambios) => {
    setTodos((lista) =>
      (lista || []).map((r) => {
        if (r.id !== id) return r;
        if (cambios === null) {
          const antes = previos.current[id];
          delete previos.current[id];
          return antes || r;
        }
        if (!previos.current[id]) previos.current[id] = r;
        return { ...r, ...cambios };
      })
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar])
  );

  const avisos = useMemo(() => (todos ? todos.filter((r) => r.activo) : null), [todos]);
  return { avisos, todos, error, recargar, actualizar };
}

// Vacunas de todos los integrantes y mascotas (una consulta por cada uno), con su dueño. Sirve para las alertas
// y para el estado "vacunas al día / vencidas" de las mascotas.
export function useVacunas(integrantes, mascotas) {
  const [vacunas, setVacunas] = useState([]);

  const cargar = useCallback(async () => {
    const miembros = [
      ...integrantes.map((i) => ({ clase: 'integrante', id: i.id, nombre: i.nombre })),
      ...mascotas.map((m) => ({ clase: 'mascota', id: m.id, nombre: m.nombre })),
    ];
    const respuestas = await Promise.all(
      miembros.map(async (m) => {
        try {
          const lista = await getList('/api/salud/vacunas', {
            params: m.clase === 'integrante' ? { integrante_id: m.id } : { mascota_id: m.id },
          });
          return lista.map((v) => ({
            id: v.id,
            nombre: v.nombre,
            proxima: v.proxima_dosis ? parseApiDate(v.proxima_dosis) : null,
            duenoClase: m.clase,
            duenoId: m.id,
            duenoNombre: m.nombre,
          }));
        } catch {
          return [];
        }
      })
    );
    setVacunas(respuestas.flat());
  }, [integrantes, mascotas]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  return vacunas;
}
