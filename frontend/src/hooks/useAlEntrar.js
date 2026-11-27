import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Devuelve [ref, visto]: `visto` pasa a true la primera vez que el elemento entra en pantalla
// (web, IntersectionObserver). Sirve para que una entrada tipo "paper-pop" corra cuando la persona
// llega a esa parte de la página y no al cargar. En nativo, o sin IntersectionObserver, es true
// desde el principio.
export default function useAlEntrar(umbral = 0.3) {
  const ref = useRef(null);
  const sinObservador = Platform.OS !== 'web' || typeof IntersectionObserver === 'undefined';
  const [visto, setVisto] = useState(sinObservador);

  useEffect(() => {
    if (visto) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    let io;
    try {
      io = new IntersectionObserver(
        ([entrada]) => {
          if (entrada.isIntersecting) {
            setVisto(true);
            io.disconnect();
          }
        },
        { threshold: umbral }
      );
      io.observe(el);
    } catch {
      setVisto(true);
    }
    return () => io && io.disconnect();
  }, [visto, umbral]);

  return [ref, visto];
}
