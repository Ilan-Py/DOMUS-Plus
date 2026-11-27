import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Preferencias de la persona en este dispositivo (se guardan en AsyncStorage, que en web es localStorage):
//  - tamaño de texto: Normal, Grande o Muy grande (escala toda la tipografía, ver theme/escalaTexto.js);
//  - recordatorios anticipados: avisar antes de cada dosis o turno (ver utils/notifications.js).
export const CLAVE_ESCALA = 'domus_escala_texto';
export const CLAVE_ANTICIPADOS = 'domus_pref_anticipados'; // versión vieja (sí/no, 30 min fijos)
export const CLAVE_ANTICIPO_MIN = 'domus_pref_anticipo_min'; // minutos de anticipo; 0 = sin aviso anticipado
export const ESCALAS = { normal: 1, grande: 1.15, muygrande: 1.3 };

// Sólo el factor numérico; lo consumen los Text/TextInput parchados.
export const EscalaTextoContext = createContext(1);
const PreferenciasContext = createContext(null);

export function PreferenciasProvider({ children }) {
  const [escala, setEscalaState] = useState('normal');
  const [anticipoMin, setAnticipoMinState] = useState(0);

  useEffect(() => {
    let activo = true;
    Promise.all([AsyncStorage.getItem(CLAVE_ESCALA), AsyncStorage.getItem(CLAVE_ANTICIPO_MIN), AsyncStorage.getItem(CLAVE_ANTICIPADOS)])
      .then(([e, min, viejo]) => {
        if (!activo) return;
        if (e && ESCALAS[e]) setEscalaState(e);
        // Quien tenía activado el aviso viejo conserva sus 30 minutos.
        const n = min !== null ? Number(min) : viejo === 'true' ? 30 : 0;
        setAnticipoMinState(Number.isFinite(n) && n >= 0 ? n : 0);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  function setEscala(valor) {
    if (!ESCALAS[valor]) return;
    setEscalaState(valor);
    AsyncStorage.setItem(CLAVE_ESCALA, valor).catch(() => {});
  }
  function setAnticipoMin(valor) {
    const n = Number(valor) > 0 ? Number(valor) : 0;
    setAnticipoMinState(n);
    AsyncStorage.setItem(CLAVE_ANTICIPO_MIN, String(n)).catch(() => {});
  }

  return (
    <PreferenciasContext.Provider value={{ escala, setEscala, anticipoMin, setAnticipoMin }}>
      <EscalaTextoContext.Provider value={ESCALAS[escala]}>{children}</EscalaTextoContext.Provider>
    </PreferenciasContext.Provider>
  );
}

export function usePreferencias() {
  const ctx = useContext(PreferenciasContext);
  if (!ctx) throw new Error('usePreferencias debe usarse dentro de un PreferenciasProvider.');
  return ctx;
}
