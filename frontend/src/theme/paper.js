import { Platform } from 'react-native';
import { SOMBRA_PAPEL } from './papel';

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

// Ruido de papel: SVG feTurbulence al 4 % de opacidad, color tinta cálida (#2A2421).
const RUIDO_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix values='0 0 0 0 .165 0 0 0 0 .141 0 0 0 0 .129 0 0 0 1.2 0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(#n)' opacity='.04'/></svg>";

const CSS = `
:root {
  --paper-1: ${SOMBRA_PAPEL[1]};
  --paper-2: ${SOMBRA_PAPEL[2]};
  --paper-3: ${SOMBRA_PAPEL[3]};
}

/* Grano de papel sobre el fondo crema: 4 % de opacidad, no intercepta clics. */
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
  animation: paper-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}
/* Entrada del modal de confirmación: igual que paper-pop pero de 240 ms. */
[data-paper~="popmodal"] {
  animation: paper-pop 240ms cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}
[data-paper~="d1"] { animation-delay: 90ms; }
[data-paper~="d2"] { animation-delay: 180ms; }
[data-paper~="d3"] { animation-delay: 270ms; }
[data-paper~="d4"] { animation-delay: 360ms; }
[data-paper~="d5"] { animation-delay: 450ms; }

/* Ficha de cartulina (ficha de emergencia): sombra corta y nítida pegada abajo + difusa cálida.
   Sin giros ni entrada animada. Los contactos ("carton") suman una micro-elevación al pasar el mouse. */
[data-paper~="ficha"] {
  box-shadow: 0 3px 0 rgba(42, 36, 33, 0.07), 0 10px 24px rgba(42, 36, 33, 0.06) !important;
}
/* Tarjetas de lista (Familia): sombra de cartulina en dos capas, sin hover propio. */
[data-paper~="cartulina"] {
  box-shadow: 0 3px 0 rgba(42, 36, 33, 0.07), 0 8px 18px rgba(42, 36, 33, 0.06) !important;
}
/* Micro-elevación al pasar el mouse para stickers decorativos. */
[data-paper~="lift"] { transition: translate 160ms ease-out; }
@media (hover: hover) {
  [data-paper~="lift"]:hover { translate: 0 -2px; }
}
[data-paper~="carton"] {
  box-shadow: 0 3px 0 rgba(42, 36, 33, 0.07), 0 6px 14px rgba(42, 36, 33, 0.05) !important;
  transition: translate 160ms ease-out, box-shadow 160ms ease-out;
}
@media (hover: hover) {
  [data-paper~="carton"]:hover {
    translate: 0 -2px;
    box-shadow: 0 5px 0 rgba(42, 36, 33, 0.07), 0 10px 20px rgba(42, 36, 33, 0.07) !important;
  }
}

/* Bandera de papel: borde inferior irregular "cortado a tijera" (sólo en la capa de fondo, para no recortar
   los menús que se despliegan). */
[data-paper~="recorte"] {
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 0px), 95% calc(100% - 7px), 90% calc(100% - 3px), 85% calc(100% - 7px), 80% calc(100% - 0px), 75% calc(100% - 7px), 70% calc(100% - 3px), 65% calc(100% - 7px), 60% calc(100% - 0px), 55% calc(100% - 7px), 50% calc(100% - 3px), 45% calc(100% - 7px), 40% calc(100% - 0px), 35% calc(100% - 7px), 30% calc(100% - 3px), 25% calc(100% - 7px), 20% calc(100% - 0px), 15% calc(100% - 7px), 10% calc(100% - 3px), 5% calc(100% - 7px), 0% calc(100% - 0px));
}

/* PaperCard: cartulina sin borde con sombra de papel apilado en 3 niveles. Al pasar el mouse la hoja se levanta
   2 px y pasa al nivel siguiente (150-200 ms). */
[data-paper~="papel"] {
  transition: translate 170ms ease-out, box-shadow 170ms ease-out;
}
[data-paper~="p1"] { box-shadow: var(--paper-1) !important; }
[data-paper~="p2"] { box-shadow: var(--paper-2) !important; }
[data-paper~="p3"] { box-shadow: var(--paper-3) !important; }
@media (hover: hover) {
  [data-paper~="papel"]:hover { translate: 0 -2px; }
  [data-paper~="p1"]:hover { box-shadow: var(--paper-2) !important; }
  [data-paper~="p2"]:hover, [data-paper~="p3"]:hover { box-shadow: var(--paper-3) !important; }
}

@media (prefers-reduced-motion: reduce) {
  [data-paper~="papel"] { transition: none; }
  [data-paper~="papel"]:hover { translate: none; }
  [data-paper~="carton"], [data-paper~="lift"] { transition: none; }
  [data-paper~="lift"]:hover { translate: none; }
  [data-paper~="carton"]:hover { translate: none; }
  .paper-pop,
  [data-paper~="pop"],
  [data-paper~="popmodal"] { animation: none; }
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
