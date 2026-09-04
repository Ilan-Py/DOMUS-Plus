# DOMUS+ — Sistema de diseño

## Estado actual

Tokens definidos en `frontend/src/theme/colors.js` (colores, radios,
sombra) — usados por los seis componentes compartidos en
`frontend/src/components/` y heredados por todas las pantallas.

## Propuesta en evaluación: Glassmorphism / Soft UI

- **Layout**: elementos superpuestos asimétricos; FABs circulares que
  rompen el borde de las cards vía posicionamiento absoluto.
- **Estilo**: border-radius extremo (32 en cards, 50 en pill-tags);
  paneles translúcidos vía blur; sombras muy sutiles.
- **Tipografía**: sans-serif geométrica redondeada (ej. Poppins —
  confirmar disponibilidad vía `expo-font`/Google Fonts antes de
  asumir que está cargada).
- **Paleta**: fondo `#F4F5F4`, cards blancas/translúcidas, paneles
  secundarios `#D5E8D4`, texto/FABs primarios `#000000`, acentos
  `#DFFF22`.

### Restricción técnica a resolver

`backdrop-filter` (CSS) no tiene equivalente directo en React Native.
`expo-blur` (`<BlurView>`) es el camino estándar en iOS/Android, pero
se comporta distinto en web. Cualquier implementación debe
especificar el camino concreto por plataforma, no asumir que el blur
"funciona igual" que en un navegador.

### Estado de la migración

En curso, no "sin empezar" (este archivo había quedado desactualizado).
Tokens y la mayoría de los componentes compartidos migrados; el detalle
pantalla por pantalla de qué falta revisar vive en `docs/QA_CHECKLIST.md`
(no se duplica acá para no tener dos fuentes de verdad).

## Migración 2: paleta "hogareño" (cálida)

Segunda pasada de paleta sobre la base glassmorphism de arriba — layout,
border-radius y tipografía de la migración 1 no cambian, sólo el color:

- **Base**: crema cálido `#FBF6EE` (era gris frío `#F4F5F4`).
- **Acentos**: dos roles en vez de uno decorativo — terracota
  `#D9603A`/`#B4491F` para "urgente/necesita atención", verde salvia
  profundo `#4C6B4F`/`#D6E2D6`/`#3D5940` para "saludable/al día".
- **Cards**: blanco sólido `#FFFFFF`, ya no vidrio translúcido.
- **Texto**: negro cálido `#2B2417` (primario), gris cálido `#8A8171`
  (muted, colapsa dos tonos muted anteriores en uno — a revisar).

### Estado de la migración

Sólo tokens (`frontend/src/theme/colors.js`) — ningún screen ni
componente fue tocado en esta pasada, así que la app se sigue viendo
como glassmorphism hasta que se haga un pase de wiring aparte. Ver el
diff de esa sesión para las inferencias que no venían explícitas en el
pedido (unificación de `green`/`greenDeep` con la familia salvia,
`reminderBadge` re-coloreado, hairlines/bordes recalculados a tono
cálido, etc.) — quedan para revisar antes de wirear a screens.
