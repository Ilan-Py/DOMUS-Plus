import { Platform } from 'react-native';

// Sistema visual "paper cutout" (recorte de papel), sutil y sólo como acento táctil:
// bordes blancos limpios, sombra cálida en dos capas, micro-elevación al pasar el mouse y una
// entrada corta con leve rebote. Paleta: #FBF6EE · #F3EAE0 · #2A2421 · #C24623.
//
// En web se inyecta una hoja de estilos global (abajo) y los componentes se enganchan con
// `paper(...)` → atributo data-paper (React Native Web no usa className). En nativo `paper()` no
// hace nada: ahí las tarjetas conservan su sombra simple de siempre.
//
// Reglas de uso (accesibilidad para adultos mayores): nada de rotaciones, temblores ni loops
// sobre formularios, textos legibles ni la ficha de emergencia. Sólo entrada única y hover.

// Ruido de papel: SVG feTurbulence al 2 % de opacidad, color tinta cálida (#2A2421).
const RUIDO_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix values='0 0 0 0 .165 0 0 0 0 .141 0 0 0 0 .129 0 0 0 1.2 0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(#n)' opacity='.02'/></svg>";

const CSS = `
/* Grano de papel sobre el fondo crema: 2 % de opacidad, no intercepta clics. */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
  background-image: url("data:image/svg+xml,${encodeURIComponent(RUIDO_SVG)}");
  background-size: 160px 160px;
}

/* Tarjetas/stickers flotantes: borde blanco limpio + sombra cálida en dos capas. */
.paper-cutout,
[data-paper~="cutout"] {
  border-color: #FFFFFF !important;
  box-shadow: 0 1px 2px rgba(42, 36, 33, 0.12), 0 8px 20px rgba(42, 36, 33, 0.08) !important;
  transition: translate 160ms ease-out, box-shadow 160ms ease-out;
}
@media (hover: hover) {
  .paper-cutout:hover,
  [data-paper~="cutout"]:hover {
    translate: 0 -2px;
    box-shadow: 0 2px 3px rgba(42, 36, 33, 0.12), 0 12px 26px rgba(42, 36, 33, 0.1) !important;
  }
}

/* Entrada única, 320 ms, rebote leve. Usa scale/translate (propiedades individuales) para no
   pisar el transform en línea (ej. el giro de un sticker). Sin loops. */
@keyframes paper-pop {
  0%   { opacity: 0; scale: 0.9; translate: 0 8px; }
  60%  { opacity: 1; scale: 1.03; translate: 0 -1px; }
  100% { opacity: 1; scale: 1; translate: 0 0; }
}
.paper-pop,
[data-paper~="pop"] {
  animation: paper-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
[data-paper~="d1"] { animation-delay: 90ms; }
[data-paper~="d2"] { animation-delay: 180ms; }
[data-paper~="d3"] { animation-delay: 270ms; }
[data-paper~="d4"] { animation-delay: 360ms; }
[data-paper~="d5"] { animation-delay: 450ms; }

@media (prefers-reduced-motion: reduce) {
  .paper-pop,
  [data-paper~="pop"] { animation: none; }
  .paper-cutout,
  [data-paper~="cutout"] { transition: none; }
  .paper-cutout:hover,
  [data-paper~="cutout"]:hover { translate: none; }
}
`;

export function injectPaperCss() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('domus-paper-css')) return;
  const estilo = document.createElement('style');
  estilo.id = 'domus-paper-css';
  estilo.textContent = CSS;
  document.head.appendChild(estilo);
}

// Props para enganchar un View a las utilidades. Banderas: 'cutout' (borde blanco + sombra +
// hover), 'pop' (entrada), 'd1'..'d5' (escalonado). Ej.: <View {...paper('cutout', 'pop', 'd2')} />
export function paper(...banderas) {
  if (Platform.OS !== 'web') return {};
  return { dataSet: { paper: banderas.filter(Boolean).join(' ') } };
}

// Escalonado según milisegundos de retraso (0, 90, 180…) → 'd1'…'d5'.
export function demora(ms = 0) {
  const n = Math.round(ms / 90);
  return n >= 1 ? `d${Math.min(n, 5)}` : null;
}
