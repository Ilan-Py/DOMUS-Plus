import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getList } from '../api/client';
import { parseApiDate } from '../utils/displayFormat';
import { prepararAvisos } from '../utils/avisos';

// Recordatorios pendientes del grupo, recargados cada vez que la pantalla toma el foco.
// `avisos` es null mientras carga. `setAvisos` permite actualizar en el acto (interfaz optimista).
export default function useAvisos() {
  const [avisos, setAvisos] = useState(null);
  const [error, setError] = useState(false);

  const recargar = useCallback(async () => {
    try {
      setAvisos(prepararAvisos(await getList('/api/recordatorios')));
      setError(false);
    } catch {
      setError(true);
      setAvisos((previos) => previos || []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar])
  );

  return { avisos, setAvisos, error, recargar };
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
