import { useRef } from 'react';

// Al guardar un formulario con errores, lleva el foco al primer campo con
// problema (en pantalla se desplaza hasta él). Así quien usa teclado o lector
// de pantalla no tiene que buscarlo.
//
//   const { ref, focusFirst } = useFirstErrorFocus();
//   <FormField inputRef={ref('nombre')} ... />
//   focusFirst([[faltaNombre, 'nombre'], [faltaFecha, 'fecha']]);  // en el orden de pantalla
export default function useFirstErrorFocus() {
  const refs = useRef({});

  // Devuelve un ref-callback estable por nombre de campo.
  const callbacks = useRef({});
  function ref(name) {
    if (!callbacks.current[name]) {
      callbacks.current[name] = (node) => {
        refs.current[name] = node;
      };
    }
    return callbacks.current[name];
  }

  function focusFirst(pares) {
    for (const [hayError, name] of pares) {
      const node = refs.current[name];
      if (hayError && node && typeof node.focus === 'function') {
        node.focus();
        return;
      }
    }
  }

  return { ref, focusFirst };
}
