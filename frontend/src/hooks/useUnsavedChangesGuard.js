import { useEffect, useRef } from 'react';
import { confirmarDestructivo } from '../utils/confirm';

// Intercepta la salida de un formulario (back físico/gesto, el botón
// "Cancelar", el back del ScreenHeader) vía el evento 'beforeRemove' de
// React Navigation cuando hay cambios sin guardar. `isDirty` se recalcula en
// cada render del caller (comparación simple contra los valores iniciales) y
// sólo importa el valor vigente al momento en que el listener corre — no hay
// nada que memoizar más allá de lo que ya hace React con el closure del
// effect.
//
// `allowNextRemove()` existe para el caso de guardar-y-salir: justo después
// de un guardado exitoso, isDirty sigue siendo true (los campos todavía no
// volvieron a su valor inicial) pero no hay nada que "descartar" — el
// screen debe llamarlo inmediatamente antes de su propio navigation.goBack()
// en la rama de éxito de handleGuardar, así el próximo beforeRemove no
// muestra el diálogo.
export function useUnsavedChangesGuard(navigation, isDirty) {
  const bypassRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (bypassRef.current || !isDirty) return;
      e.preventDefault();
      confirmarDestructivo(
        'Descartar cambios',
        'Tenés cambios sin guardar. Si salís ahora se van a perder.',
        () => {
          bypassRef.current = true;
          navigation.dispatch(e.data.action);
        },
        'Descartar'
      );
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  return {
    allowNextRemove: () => {
      bypassRef.current = true;
    },
  };
}
