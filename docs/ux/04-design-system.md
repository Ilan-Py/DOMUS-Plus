# 04 · Sistema visual papercut (Fase 4)

> Skill: `design:design-system` (auditoría + extensión). `design-elevation` no está instalada: el criterio de elevación se aplicó a
> mano (§3.5).
> Fecha: 28/11/2026 · Página viva: **`http://localhost:8081/styleguide`** (sólo web) · Capturas en `docs/ux/capturas/styleguide/`.

## 0. Principio

> **El papel va en las capas decorativas, las cabeceras, los estados vacíos y los chips. Las listas, la grilla, los formularios y la
> ficha de emergencia son planos. La estética nunca le gana a la legibilidad.**

Cinco reglas que se pueden verificar mirando una pantalla:

1. **Una protagonista por pantalla.** Es la única tarjeta con hoja de color que asoma.
2. **Un acento por tarjeta.** Hoja, barra lateral, borde superior: uno solo, nunca dos [FAM-05, EME-06].
3. **El punteado significa «acá falta algo».** Sólo `EmptySlot`. Ninguna acción real lleva borde punteado [CTA-04].
4. **Ningún color dice algo solo.** Tipo de evento y estado de una dosis llevan siempre ícono y palabra (WCAG 1.4.1).
5. **Ningún valor suelto.** Si falta un espacio, un radio o un tamaño de texto, se agrega a la escala.

## 1. Auditoría del sistema actual

| Categoría | Definido antes | Valores sueltos en `screens/`, `components/`, `navigation/` |
|---|---|---|
| Color | `colors.js` (≈ 60 tokens, varios con nombres que ya no describen el valor: `lime` = terracota, `glassFillStrong` = blanco) + `papel.js` | **221 hex** y **71 `rgba()`** escritos a mano |
| Tipografía | 2 familias (`poppinsWeight()`, `SERIF_BOLD`), **sin escala de tamaños** | **270 `fontSize`**, 18 valores distintos |
| Espaciado | `spacing.js` con 4 valores, casi sin uso | **702** `padding/margin/gap` numéricos, 27 valores distintos (incluye 7, 14, 28, 56, 112…) |
| Radios | `radii` en `colors.js` (10 / 16 / 24 / 999) | **20 valores distintos** de `borderRadius` (2, 3, 5, 11, 15, 21, 26, 36…) |
| Sombras | `SOMBRA_PAPEL` 1–3 (bien) + `shadow`/`glassShadow` heredadas del glassmorphism + 5 variantes CSS en `paper.js` (`cutout`, `ficha`, `cartulina`, `carton`, `lift`) | Sombras difusas con blur mezcladas con las de papel |
| Movimiento | `paper.js` (170 ms, `prefers-reduced-motion`), `useReducedMotion` | Duraciones sueltas (100, 160, 180, 220, 240, 320 ms) |

**Conclusión:** la base papercut existe y es buena (sombras de 3 niveles, grano, reduced motion). Faltaban **escalas** (texto,
espacio, radio, movimiento), **tokens semánticos** (tipos de evento, estados de dosis) y los **componentes** que la Fase 3 necesita.

## 2. Qué se agregó en esta fase

| Archivo | Qué es |
|---|---|
| `src/theme/tokens.js` | **Punto de entrada único** de los tokens: `color`, `tipoEvento`, `estadoDosis`, `colorAltoContraste`, `fuente`, `texto`, `espacio`, `radio`, `tactil`, `elevacion`, `hoja`, `movimiento`. Se apoya en `colors.js`/`papel.js` (no duplica valores) |
| `src/utils/formato.js` | `plural`, `fechaRelativa`, `fechaCorta`, `fechaLarga`, `hora`, `cuandoEvento` |
| `src/components/PaperBanner.js` + `BordeTijera.js` | Cabecera recortada con canto de tijera en SVG (web y nativo) |
| `src/components/StatChip.js` | Chip de dato con plural y estado de carga |
| `src/components/EventItem.js` | Evento con tipo, hora, persona, ↻ y estado de dosis |
| `src/components/EmptySlot.js` | Casilla punteada para agregar (`SlotVacio` queda como alias) |
| `src/components/TarjetaIntegrante.js`, `MemberCard.js`, `PetCard.js` | Tarjetas de persona y mascota con el mismo tratamiento |
| `src/components/AddMenu.js` | Menú «+ Agregar» global (botón y FAB) |
| `src/components/Ilustracion.js` | 7 ilustraciones SVG: familia, calendario, aldia, mascota, vacuna, receta, ficha |
| `src/screens/StyleguideScreen.js` | `/styleguide` |

**Cambios en lo existente (compatibles):**

| Archivo | Cambio | Impacto |
|---|---|---|
| `ToastHost.js` | Admite `{ tipo, accion, duracion }`; errores con «Cerrar» y sin cierre automático; duración según el largo; `pointerEvents="box-none"` para que la acción se pueda tocar. Exporta `Toast` (presentación) | `mostrarToast(texto)` y `mostrarToast(texto, 'error')` siguen igual. **Base de DOS-02 y DOS-05** |
| `PressScale.js` | `forwardRef` al `Pressable` | Ninguno para quien no pasa `ref` |
| `PaperCard.js` | La hoja gira 1° (antes 1,2°). Con hoja, la tarjeta usa sombra de nivel 1: la hoja ya es el papel apilado | La tarjeta «Hoy» de Familia ya usaba nivel 1: sin cambio visible |
| `EmptyState.js` | Prop `ilustracion` | Opcional |
| `SlotVacio.js` | Re-exporta `EmptySlot` (radio 16 en lugar de 12, hover terracota) | Leve cambio visual en las casillas de Familia y Cuenta |
| `paper.js` | Utilidad `paper('grano')` para un elemento puntual | — |
| `App.js` | Ruta `/styleguide` (web) | — |

**Las pantallas todavía no usan los componentes nuevos:** eso es la Fase 6. Se verificó que Familia, Calendario y Cuenta siguen
cargando sin errores nuevos y que el toast responde («Código copiado»).

## 3. Tokens

### 3.1 Color

Se mantiene la paleta actual donde el prompt proponía valores muy cercanos, porque la actual **ya está validada en AA**:

| Rol | Prompt | Token | Valor | Uso | Contraste |
|---|---|---|---|---|---|
| Fondo | crema `#F8F2EA` | `color.fondo` | `#FBF6EE` | Fondo de página | tinta 14.22:1 |
| Cards | cartulina `#FFFDF9` | `color.cartulina` | `#FFFDF9` | Tarjetas | tinta 15.06:1 |
| Primario | terracota `#C4472B` | `color.terracota` | `#C24623` | Botón primario, foco, hoy | blanco encima 5.01:1 |
| Mascotas | salvia `#4F6F5E` | `color.salvia` | `#4A6B5D` | Mascotas, «al día», Dar | blanco 5.91:1 · sobre cartulina 5.82:1 |
| Vacunas | mostaza `#D9A23B` | `color.mostaza` | `#D9A23B` | **Sólo relleno decorativo** (2.25:1) | marca de vacuna: `#B9841F` (3.24:1) |
| Medicación | rosa `#E8A598` | `color.rosa` | `#E8A598` | **Sólo relleno decorativo** (2.01:1) | marca de medicación: `#D27C6B` (3.02:1) |
| Texto | tinta `#2B211C` | `color.tinta` | `#2A2421` | Texto principal | 15.06:1 |
| — | — | `color.texto` | `#574E49` | Texto secundario (también sobre arena) | 7.53:1 · arena 6.81:1 |
| — | — | `color.textoSuave` | `#726A5D` | Meta sobre cartulina. **Nunca sobre arena** | 5.25:1 · arena 4.49:1 ❌ |
| — | — | `color.terracotaTexto` | `#AA451D` | Enlaces y texto de acento | 5.78:1 |
| — | — | `color.error` | `#A6291B` | Errores, sobre `errorFondo` | 6.21:1 |

**Tipos de evento** (`tipoEvento`): siempre ícono + nombre; el color es la tercera señal.

| Tipo | Ícono | `marca` (punto, ≥ 3:1) | `fondo` | `texto` (≥ 4.5:1) | Hoja |
|---|---|---|---|---|---|
| Medicación | `medkit` | `#D27C6B` · 3.02 | `#F8E1DB` | `#8E3A2A` · 6.02 | rosa |
| Vacuna | `shield-checkmark` | `#B9841F` · 3.24 | `#F8EBCB` | `#6E4A0E` · 6.70 | mostaza |
| Turno o control | `calendar` | `#8A7663` · 4.26 | `#EEE4D8` | `#4A3B32` · 8.52 | arena |

> **Cambio respecto de hoy:** el Calendario y «Hoy» usan medicación = terracota, turno = ocre y vacuna = salvia (`utils/avisos.js`,
> `MiniCalendar.js`). Con estos tokens, medicación pasa a rosa, vacuna a mostaza y turno a arena, como pide el prompt. Así **salvia
> queda sólo para mascotas y «al día»** y **terracota sólo para el primario y la urgencia**, sin mezclar significados. Se aplica en la
> Fase 6 cambiando `TIPO_AVISO` y `TONO_CATEGORIA`, que pasan a leer de `tipoEvento`.

**Estados de una dosis** (`estadoDosis`, de `03-definicion.md` §2):

| Estado | Símbolo | Ícono | Color | Fondo |
|---|---|---|---|---|
| Pendiente | ● | `ellipse-outline` | `#574E49` | — |
| Sin marcar | ! | `alert-circle` | `#9A3416` (6.33:1) | `#FAECE7` |
| Dada | ✓ | `checkmark-circle` | `#3D5A4B` (7.48:1) | `#E3ECE6` |
| No se dio | ✕ | `close-circle` | `#6B6357` (5.83:1) | `#EFE9E2` |
| Próxima | ○ | `time-outline` | `#574E49` | — |

**Contraste alto** (`colorAltoContraste`): fondo y cartulina blancos, tinta `#1A1411` (18.23:1), texto secundario `#3F3631`
(11.78:1), líneas al 45 %. Con la preferencia activa, sin grano ni hojas (Fase 6, decisión D2).

### 3.2 Tipografía

| Token | Familia | Tamaño / alto | Uso |
|---|---|---|---|
| `texto.pantalla` | Lora 700 | 32 / 40 | Título de pantalla (h1) — **en todas**, también Detalle y formularios [VIS-01] |
| `texto.seccion` | Lora 700 | 22 / 30 | Protagonista y secciones (h2) |
| `texto.tarjeta` | Lora 700 | 18 / 24 | Título de tarjeta (h3) |
| `texto.nombre` | Jakarta 500 | 17 / 24 | Nombres, títulos de evento |
| `texto.cuerpo` | Jakarta 400 | 16 / 24 | Cuerpo |
| `texto.cuerpoChico` | Jakarta 400 | 14 / 20 | Bajadas |
| `texto.etiqueta` | Jakarta 500 | 15 / 20 | Botones, chips, pestañas |
| `texto.meta` | Jakarta 400 | 13 / 18 | Datos secundarios. **Mínimo de la app** |
| `texto.sobretitulo` | Jakarta 600 | 13 / 18, +0.4 | «HOY · VIERNES 27» |
| `texto.hora` | Jakarta 600 tabular | 15 / 20 | Horas |
| `texto.dato` | Jakarta 600 tabular | 28 / 32 | Sangre, contadores, % |

Reemplaza los 18 tamaños sueltos por 11. El peso lo da la familia, nunca `fontWeight` (en web engorda las fuentes custom; ver
`typography.js`). La escala de texto del usuario (×1, ×1,15, ×1,3) multiplica todo esto sin tocar nada.

### 3.3 Espaciado, radios y táctil

| `espacio[n]` | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 |
|---|---|---|---|---|---|---|---|---|---|---|
| px | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64 |

Índice × 4 = px: `espacio[6]` es 24. Reemplaza los 27 valores sueltos (7, 14, 28, 56…).

| `radio` | etiqueta | control | tarjeta | contenedor | pastilla |
|---|---|---|---|---|---|
| px | 8 | 10 | 16 | 24 | 999 |

Reemplaza los 20 radios sueltos por 5. Los círculos usan `tamaño / 2`.

| `tactil` | minimo | comodo | fab |
|---|---|---|---|
| px | 44 | 48 | 56 |

44 es el piso de todo lo que se toca [FAM-04, CAL-05, CTA-05]; 48 para lo frecuente (Dar, Llamar, ítems de menú).

### 3.4 Movimiento

| Token | ms | Uso |
|---|---|---|
| `movimiento.rapido` | 120 | Respuesta a un toque |
| `movimiento.base` | 170 | La hoja se levanta 2 px al pasar el mouse |
| `movimiento.lento` | 240 | Entrada de menús y toasts |
| `movimiento.curva` | `cubic-bezier(0.2, 0.7, 0.3, 1)` | Salida suave, sin rebote |

Con «reducir movimiento» (`prefers-reduced-motion` en web, `AccessibilityInfo` en nativo): sin desplazamientos ni escalas, sólo
cambia la sombra o la opacidad. Ya lo cumplen `paper.js`, `PressScale`, `ToastHost` y `EmptyState`. **Nunca** animación sobre la
ficha de emergencia ni sobre formularios.

### 3.5 Papel

| Recurso | Cómo | Dónde sí | Dónde no |
|---|---|---|---|
| **Sombra apilada** 1–3 | Capas duras desplazadas (3×4, 4×5 + 8×10, 5×6 + 10×12), sin blur. `PaperCard nivel` | 1: tarjetas · 2: protagonista · 3: menús y toasts | — |
| **Hoja de color** | Segunda hoja detrás, ±1°, 6 px corrida. `PaperCard hoja` | **Sólo la protagonista** (Hoy, Mi ficha) | Listas, formularios, ficha de emergencia |
| **Canto de tijera** | `BordeTijera`: SVG determinístico, dos capas (papel + capa 4 px más abajo) | `PaperBanner` (cabeceras) | Tarjetas con datos |
| **Grano** | SVG `feTurbulence` al **4 %**, global por encima de todo + `paper('grano')` puntual | Fondo, cabeceras, vacíos | — |
| **Ilustraciones** | `Ilustracion`: 2–4 capas planas + sombra de papel + canto blanco | Estados vacíos, cabeceras | Al lado de un dato de salud |

**Decisión sobre el grano:** hoy es una capa fija sobre toda la página (`body::after`, 4 %), así que también pasa sobre las
tarjetas. Moverlo debajo del contenido exigiría poner los fondos de React Native en transparente en todas las pantallas. Se dejó
como está porque al 4 % no cambia el contraste medido (Fase 2) y no compite con los datos. Si en la Fase 7 se ve ruido sobre la
ficha, el plan B es `paper('grano')` sólo en los fondos de pantalla.

## 4. Componentes

### PaperBanner
Cabecera de papel recortado. Título serif (h1), bajada, contenido (stats, acciones) e ilustración chica a la derecha.

| Prop | Tipo | Default | |
|---|---|---|---|
| `titulo` | string | — | h1 de la pantalla |
| `bajada` | string | — | |
| `ilustracion` | node | — | Decorativa (oculta al lector) |
| `tono` | `'arena' \| 'terracota' \| 'salvia'` | `'arena'` | |
| `compacto` | bool | `false` | Menos padding (mobile, Familia) |
| `children` | node | — | `StatChip`, botones |

**Do:** una por pantalla, arriba. **Don't:** poner datos de salud adentro (los stats son contadores, no datos).

### StatChip
«2 dosis hoy». Número tabular + plural automático.

| Prop | Tipo | |
|---|---|---|
| `valor` | number \| null | `null` = cargando → «…» (**nunca «0» mientras carga**, SIS-02) |
| `singular`, `plural`, `sufijo` | string | `plural` por defecto: singular + «s» |
| `tono` | `'neutro' \| 'alerta' \| 'ok'` | |
| `onPress` | fn | Si viene, es botón de 44 px |
| `ocultarSiCero` | bool | La Familia vacía no muestra «0 …» [FAM-02] |

Lector: «2 dosis hoy, botón».

### EventItem
Un evento de salud en una lista. Un solo acento: el círculo del tipo (sin barra lateral).

| Prop | Tipo | |
|---|---|---|
| `tipo` | `'medicacion' \| 'control' \| 'vacuna'` | |
| `titulo` | string | Si falta, el nombre del tipo |
| `fecha`, `todoElDia` | Date, bool | Formato con `cuandoEvento`: «08:00», «mañana 10:00», «miércoles 25/11 · 08:00 · hace 3 días» |
| `persona` | `{ nombre, apellido, avatarId, fotoUrl, clase }` | |
| `recurrente` | bool | ↻ con `accessibilityLabel` «Se repite» |
| `estado` | `'pendiente' \| 'sin_marcar' \| 'dada' \| 'no_se_dio' \| 'futura'` | |
| `detalleEstado` | string | «Dada 07:05 · Mónica» |
| `onPress` | fn | Abre el detalle |
| `children` | node | Acciones: **hermanas** del botón principal, nunca adentro |

| Estado | Visual | Acciones (Fase 6) |
|---|---|---|
| Pendiente | Normal | Dar · Más tarde |
| Sin marcar | Hora en terracota oscuro + sello «! Sin marcar» | Se dio… · No se dio |
| Dada | Sello «✓ Dada 07:05 · Mónica» | Deshacer |
| No se dio | Título tachado en gris + sello «✕ No se dio» | Deshacer |
| Futura | Normal, sin acciones de marca | (Editar desde Calendario) |

Lector: «Losartán 50 mg, Medicación, miércoles 25/11 · 08:00 · hace 3 días, de María Elena, se repite, Sin marcar».
**No** usar opacidad para «dada» (bajaba el contraste): el estado lo dice el sello.

### MemberCard / PetCard (`TarjetaIntegrante`)
Mismo tamaño, mismas acciones, mismo peso para personas y mascotas.

| Parte | MemberCard | PetCard |
|---|---|---|
| Cabecera (botón → detalle) | Avatar · «María Elena Argento» · «Mayor · 79 años» | Avatar · «Fatiga» · «Perro · Mestizo · 6 años» |
| Chips | Sangre (gota + «A+»), «Alergias: …» | «Vacunas al día» / «Vacuna próxima» / «Vacuna vencida» |
| Próximo | ◷ «Gotas para los ojos · hoy 23:30» | ◷ «Antirrábica · en 45 días» |
| Ficha incompleta | Barra «Ficha de emergencia · 0 %» + botón **Completar ficha** (primario) [EME-08] | Ídem |
| Ficha completa | Botón **Ficha** (secundario) | Ídem |

Estados: hover (la hoja se levanta), foco (anillo en la cabecera y en el botón), cargando (usar `Skeleton` con la misma caja).
Lector: «María Elena Argento, Mayor · 79 años. Ver detalle» · «Completar la ficha de emergencia de Nélida Quiroga».

### EmptySlot
El **único** borde punteado de la app. Ícono + texto (+ subtexto). Hover: borde y texto terracota.
Lector: «Agregar Persona sin cuenta. Un nene, un abuelo…».

### EmptyState
Ilustración (o recortes) + título serif + mensaje + hasta 2 acciones. Prop nueva `ilustracion`.
**Do:** decir qué hacer («Sumarme yo», «Agregar a alguien»). **Don't:** un texto suelto en una caja [CAL-07].

### Toast (`ToastHost` + `mostrarToast`)

| Tipo | Sello | Se va solo | Anuncio |
|---|---|---|---|
| `ok` | ✓ salvia | Sí: máx(4 s, 1 s cada 4 palabras + 1,5 s) | `role="status"`, polite |
| `ok` + `accion` | ✓ salvia + botón subrayado | Sí, a los 8 s como mínimo | polite |
| `error` | ! terracota + **Cerrar** | **No** | `role="alert"`, assertive |
| `info` | i tinta | Sí | polite |

```js
mostrarToast('Losartán marcado como dado', { accion: { etiqueta: 'Deshacer', onPress: deshacer } });
mostrarToast('No pudimos guardar. Probá de nuevo en un rato.', 'error');
```
La acción y «Cerrar» miden 44 px. El toast no tapa la barra inferior (queda 96 px arriba en mobile).

### AddMenu
«+ Agregar» con los 6 destinos de `03-definicion.md` §1.4, en dos grupos (Cuidar · La familia).

| Prop | Tipo | |
|---|---|---|
| `onElegir(clave)` | fn | `'medicacion' \| 'control' \| 'vacuna' \| 'persona' \| 'mascota' \| 'invitar'` |
| `variante` | `'boton' \| 'fab'` | Botón con desplegable (desktop) · botón flotante con hoja inferior (mobile) |
| `excluir` | string[] | Ocultar destinos según el contexto |
| `etiqueta`, `style` | | |

**Teclado (verificado):** Enter abre → foco en «Medicación» · ↑ ↓ recorren · Escape cierra y **devuelve el foco al botón**.
Clic afuera cierra. `role="menu"` / `menuitem`, `aria-haspopup`, `aria-expanded`.

### Ilustracion
`<Ilustracion nombre="familia" size={96} />`. Nombres: `familia`, `calendario`, `aldia`, `mascota`, `vacuna`, `receta`, `ficha`.
Sin QR (decisión D1). Siempre decorativa.

## 5. Checklist anti-vibecoded sobre el sistema

| Ítem | Estado |
|---|---|
| Degradados violeta/azul, glassmorphism, glow | ✅ Ninguno. Quedan tokens `glass*` y `shadow`/`glassShadow` de la migración 1 en `colors.js`: deuda para el handoff |
| Emojis como íconos | ✅ Ionicons outline + SVG propio. En el styleguide se sacó un «✓» del texto de un botón |
| Cards todas iguales | ✅ Niveles 1/2/3, una protagonista con hoja, tarjetas de integrante distintas de las de evento |
| Espaciados arbitrarios | ⚠️ El sistema tiene escala; las pantallas todavía no la usan (702 valores sueltos) → Fase 6, pantalla por pantalla |
| Mezcla de sets de íconos | ✅ Sólo Ionicons (outline para navegación, filled para tipos y estados) |
| Interactivos sin hover/foco/disabled | ✅ En los componentes nuevos. `PrimaryButton` ya tenía los 4 estados |
| Sombras blur de plantilla | ⚠️ Las nuevas son duras. Quedan blur en `cutout`/`ficha`/`cartulina`/`carton` de `paper.js` y en `EntityAvatar` → Fase 6 |
| Decoración que compite con datos | ✅ Regla 1 + `EventItem` y tarjetas planas |
| tabular-nums, plurales, fechas relativas | ✅ `texto.hora`, `texto.dato`, `utils/formato.js` |

## 6. Migración (lo que hace la Fase 6)

1. `TIPO_AVISO` (`utils/avisos.js`) y `TONO_CATEGORIA` (`MiniCalendar.js`) leen de `tipoEvento`.
2. Familia: `PaperBanner` + `StatChip` + `EventItem` + `MemberCard`/`PetCard` + `EmptySlot` + `AddMenu`.
3. Calendario y Cuenta: lo mismo con sus piezas; `ScreenHeader` pasa a título serif para Detalle y formularios.
4. Cada pantalla que se toca pasa sus números sueltos a `espacio`/`radio`/`texto`. No se hace un reemplazo masivo (riesgo alto y
   sin tests): se migra lo que se toca.
5. Deuda: sombras blur de `paper.js` y `EntityAvatar`, tokens `glass*`, warning de `BannerRecortes` (pasa
   `accessibilityElementsHidden` a un `<svg>` del DOM; ya existía antes de esta fase).

## Anexo · Íconos de tipo (ronda de ajustes)

- `components/IconoTipo.js`: **pastilla** (medicación), **jeringa** (vacuna), **estetoscopio** (turno o control), del set
  MaterialCommunityIcons, mismo grosor; **pata** como insignia de mascota.
- Regla: **ícono + color, nunca uno solo**, y siempre el nombre del tipo al lado o en el `accessibilityLabel`.
- Colores de marca (≥ 3:1 sobre cartulina): medicación `#C2614F`, vacuna `#B9841F`, turno `#4F7390`.
  `TIPO_AVISO` (utils/avisos.js) y `TONO_CATEGORIA` (MiniCalendar) se derivan de `tokens.tipoEvento`.
- En listas y agenda: ícono en un círculo del color de fondo del tipo. En las celdas del mes: barra + ícono + hora.
