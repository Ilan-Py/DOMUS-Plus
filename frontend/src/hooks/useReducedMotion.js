import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// true si el sistema pide "reducir movimiento" (iOS/Android/prefers-reduced-motion en web).
// Las animaciones de escala/desplazamiento/rebote se saltean; los fades cortos pueden quedar.
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => vivo && setReduced(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      vivo = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}
