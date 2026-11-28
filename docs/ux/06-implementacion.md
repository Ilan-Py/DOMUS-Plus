# 06 · Implementación

> Fase 6 del review UI/UX. Rama `feature/ux-review` (sale de `feature/familia-hoy`). Un commit por tema; cada uno se
> probó en Edge (Playwright) en 1440 y 390 px, y los cambios de backend también con curl. Los IDs son los de
> [02-auditoria.md](02-auditoria.md) y [05-copy.md](05-copy.md) §7.

## Commits

| Commit | Qué | Hallazgos |
|---|---|---|
| `be7c026` | Documentos de las fases 0 a 5 | — |
| `9ea06bf` | Tokens, componentes base, toast con «Deshacer», `/styleguide` | Fase 4 |
| `fe01690` | Sin conexión: grupo guardado + copia local de las fichas y aviso «Sin conexión» | **EME-01 (P0)** |
| `b3ea06b` | Backend: `estado` (pendiente/hecho/omitido), `hecho_a`, `hecho_por`; `PATCH /:id/marcar` y `/:id/reactivar` | D5, base de DOS-02/03 |
| `3f4de1c` | Hoy y Calendario: «Dada» / «No se dio» con «Deshacer», «¿Se la dieron?» en las atrasadas, «Pasar a las …» seguro | **DOS-01, 02, 03 (P0)**, DOS-04, 06, 07 |
| `6e39d1e` | Toasts de error con su tipo (y persistentes) | DOS-05 |
| `bd0be92` | Emergencia como 4.º destino; ficha en modo lectura, «Toma actualmente», edad, teléfonos sin cortes; «Completar su ficha» al agregar a alguien | EME-02, 03, 04, 05, 06, 08 |
| `1159261` | Eliminar a un integrante o mascota borra también lo que tenía programado | COP-01 |
| `020f2e8` | Formulario: «Medicamento» + «Dosis», tipo sin preelegir, persona preelegida si hay una sola, errores que dicen qué falta | DOS-08, DOS-09 |
| `309294f` | Familia: `PaperBanner` + `StatChip` (sin ceros) + `AddMenu`; edad en las tarjetas; «Completar ficha»; un solo acento; semana con días de 48 px | FAM-02, 04, 05, 07, 08 |
| `ebad736` | Calendario: filtros con nombre, 44 px, «Filtrar» en el celular, `AddMenu`, marcas ✓ ⊖ ✕ en la grilla, contraste de los días, sin «0» mientras carga, vacío con `EmptyState` | CAL-01 a 07, SIS-02 |
| `ca2488f` | Copy: roles («Creó el grupo», «Puede editar»), «personas con acceso», cerrar sesión unificado, requisitos de contraseña en texto, mensajes del backend | CTA-02, COP-04, COP-05, FRM-01 |
| `75d964d` | Notificación → día del aviso; siglas como se cargaron | DOS-11, FRM-03 |
| `275113c` | Filas de vacuna y tratamiento sin botón dentro de botón (previo a la revisión) | Nuevo (a11y) |

## Estado de los hallazgos

- **P0 (4/4) resueltos.**
- **P1:** resueltos todos menos **FAM-01** (el dueño no queda como integrante): necesita `Integrante.usuarioId` en el
  backend (`TODO(backend)`). Mientras tanto Cuenta ofrece «Sumarme».
- **COP-02 descartado** (ver 05-copy.md §7): eliminar una cuenta ya reasigna lo que cargó.

## Decisiones tomadas durante la implementación

- **«Pasar a las …» no tiene «Deshacer».** La API sólo acepta horas futuras, así que volver a la hora original (ya
  pasada) no se puede guardar. El toast dice la hora nueva; la dosis se puede volver a pasar o marcar.
- **«No sé la hora»** en una dosis atrasada guarda `hecho_a` = el momento en que se marcó, y la interfaz lo muestra como
  «Dada · marcada el sábado 28/11», sin inventar una hora.
- **Copia local** (`utils/cacheLocal.js`): lista de familia, contactos y tratamientos de cada integrante, en el dispositivo
  de quien tiene la sesión. Se borra al cerrar sesión. Con conexión siempre manda el servidor.
- **Calendario en pantallas de menos de 1680 px:** la grilla muestra marcas y cantidad en vez de chips (que se truncaban a «↻08:…»).
- **Filas de vacuna/tratamiento:** se sacó el long-press para eliminar (era un gesto oculto y causaba el botón anidado);
  eliminar sigue en la pantalla de edición.

## Pendiente (pasa a la Fase 8 si no entra antes)

| Qué | Por qué no entró |
|---|---|
| Interruptor «Contraste alto» (D2) | La paleta existe (`tokens.colorAltoContraste`), pero las pantallas todavía leen `theme/colors.js` en estático. Hace falta que lean el color de un contexto: es un cambio transversal, no de una pantalla |
| FAM-01 · dueño como integrante | `TODO(backend)`: `Integrante.usuarioId` |
| CTA-07 · rol «Sólo mira» | `TODO(backend)`: rol `lector` |
| FRM-05 · cargar una dosis pasada | `TODO(backend)`: aceptar fechas pasadas para registros de toma |
| DOS-10 · horarios rápidos y «Hasta [fecha]» | P2, cambia la API de repetición |
| P2 visuales (VIS-01 títulos serif en todas las pantallas, CTA-01/03/04/05/06, FAM-03, FAM-06, EME-07, SIS-03, VIS-02/03) | Pulido; se aplican al migrar cada pantalla a los tokens |
| SIS-04 · serie «Si» de prueba (grupo 3) | Es dato local, no código: borrarla antes de la demo |
| DOS-11 en el celular | El cambio está hecho, pero las notificaciones no existen en web: falta probarlo en el APK |

## Ronda de ajustes (después del merge)

| Commit | Qué |
|---|---|
| `2adb7a3` | **Hora 3 h antes («Si» a las 02:00).** No era doble conversión: las versiones anteriores a `220bce4` mandaban la hora sin zona y un servidor en UTC (Render) la guardaba corrida −3 h. El front actual manda ISO con `Z` (verificado: 10:00 elegidas → 13:00 UTC → se ven 10:00). El backend ahora interpreta las horas sin zona como hora de Argentina (`instanteDe`), así los APK viejos tampoco las corren. «Aplicada 04:55» era la hora en que se marcó, no un error. Se borró la serie de prueba «Si» (grupo 3, local) |
| `0ceb294` | La repetición depende del tipo: medicación (todos los días, día por medio, semanal), turno (semanal a 6 meses), vacuna (mensual a anual). El backend rechaza una vacuna < 28 días o un turno < 7 |
| `4c1c217` | **Íconos de tipo** (`IconoTipo`, MaterialCommunityIcons): pastilla, jeringa, estetoscopio; pata para mascotas. Siempre ícono + color + nombre. Turno pasó a azul pizarra (el mostaza y el verde se confundían). **Mes:** chip = barra + ícono + hora (13 px); atenuado si se marcó, tachado si no se dio, borde rojo si quedó sin marcar; la recurrencia sólo en el detalle. Días de otro mes sin tarjeta; hoy sólo con el círculo y una hoja terracota detrás; el borde queda para el día elegido. **Semana:** ícono + hora + título, ancho del contenedor (antes se veían 3 días). **Filtros:** una fila (Todos · personas y mascotas · tipos, que hacen de leyenda); la leyenda de abajo es sólo de estados. **Cabecera:** bandera de papel con el mes y una ilustración de la época (jacarandá en octubre y noviembre); ‹ Hoy › en un solo control sin borde rojo; «Agregar» es la única primaria. **Panel:** «Quedó sin marcar» sólo si hay algo (si no, «Todo al día» en la agenda); resumen «11 de 14 dosis dadas» con barrita (la explicación va como ayuda); sombras de papel y hojas de color detrás. **Agenda y Hoy:** sin el avatar repetido junto al nombre |

## Ronda de la ficha («libreta sanitaria»)

| Commit | Qué |
|---|---|
| `f43687b` | Backend: mascota con `sexo`, `castrado`, `microchip` y `observaciones` (nota humana); tabla `peso` (integrante o mascota) con `GET/POST /api/salud/pesos` y `DELETE /api/salud/pesos/:id`, en `RUTAS`. Migración `20261128120000_ficha_de_mascota` (aditiva) |
| `ce43b30` | Ficha como libreta: escena de papel (pasto salvia, loma mostaza, huellas caladas; lomas y corazón para personas) con la foto en polaroid con cinta, rotada 2° (sin foto: ilustración); ficha rápida en chips (raza, edad, último peso, sexo, castración, chip) y «Completar ficha» si faltan; **post-it** para la nota humana (uno solo, rotado, cinta washi, letra Caveat, «+ Nota», se abre al tocarlo, nunca datos críticos); **pestañas de fichero** con contadores; cada vacuna es un **sticker** troquelado con «Aplicada · Próxima» y **sello** de estado (Al día / Vence pronto / Vencida / Sin refuerzo); frase de estado con el nombre («Fatiga está al día con sus vacunas»); **historial como línea de tiempo** (consultas, vacunas, pesos, tratamientos, con ícono por tipo); **peso** con mini gráfico y «Anotar»; **veterinario** con «Llamar» y «WhatsApp» y vacío «¿Quién cuida a Bruno?»; «Eliminar» en «⋯» con confirmación; 65/35 al mismo ancho que Familia y Calendario. Formulario de mascota con fecha de nacimiento, sexo, castración, microchip y nota. **Bug previo arreglado:** editar una mascota le borraba la fecha de nacimiento (el formulario no la mandaba y el backend la ponía en `null`) |

Pendiente de esta ronda: miniaturas de adjuntos dentro de la línea de tiempo (los adjuntos ya muestran miniatura en su sección);
ordenar las vacunas por próxima dosis; el post-it en las tarjetas de Familia.
