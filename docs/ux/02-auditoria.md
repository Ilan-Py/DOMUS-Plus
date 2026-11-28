# 02 · Auditoría (Fase 2)

> Skills: `design:design-critique` + `design:accessibility-review` + `web-design-guidelines` (reemplaza a `ui-review`, que no está
> instalada; `accessibility-audit` tampoco: su criterio se aplicó a mano).
> Fecha: 27/11/2026 · Rama `feature/familia-hoy` · Evidencia en `docs/ux/capturas/antes/` (`auditoria/`, `zoom200/` y las de la Fase 0).
> **Prioridad pedida:** la marca de dosis y la emergencia van primero (secciones 2 y 3).

## 0. Resumen

**53 hallazgos: 4 P0 · 21 P1 · 28 P2.**

| Severidad | Criterio |
|---|---|
| **P0** | Rompe el uso o los datos. Con datos de salud, incluye todo lo que pueda registrar una dosis que no se dio o esconder la ficha |
| **P1** | Fricción seria o falla de accesibilidad (WCAG 2.1 AA, o el mínimo táctil de 44 px que pide el prompt) |
| **P2** | Pulido, consistencia, deuda visual |

Los 4 P0 están en las dos áreas críticas:

1. **DOS-01 · «Más tarde» mueve la dosis al día siguiente.** Usado a las 23:17 sobre la dosis de las 08:00, la pasó a las **00:17 de
   mañana**. Desaparece de «Hoy» y de los vencidos, y quedan dos Losartán con 8 horas de diferencia (00:17 y 08:00).
2. **DOS-02 · «Hecho» no se puede deshacer.** En «Hoy» se marca con un toque, sin confirmación y con un toast de 2,6 s que no admite acciones.
3. **DOS-03 · Marcar un vencido de hace 3 días lo registra como dado a tiempo.** El calendario muestra ✓ el martes 24 aunque se marcó el viernes 27, sin decir cuándo ni quién.
4. **EME-01 · Sin conexión, la app «olvida» la familia.** Si `/api/familia/grupo` falla al abrir, una usuaria con familia termina en
   «Creá tu grupo familiar». No hay forma de ver ninguna ficha.

## 1. Método

| Qué | Cómo | Evidencia |
|---|---|---|
| Crítica visual y de uso | Las 111 capturas de la Fase 0 en 1440 / 834 / 390, con datos y vacías | `capturas/antes/{desktop,tablet,mobile}` |
| Marca de dosis | Prueba en vivo: «Hecho» y «Más tarde» en «Hoy», «Hecho» en Calendario, Escape en el diálogo, «Hecho» con la red cortada. Lectura de la base antes y después | `auditoria/dosis-*.png`, consultas SQL (§2) |
| Estados de carga y error | Playwright: API demorada 6 s y API rechazando conexiones, en Familia, Calendario y Cuenta | `auditoria/{mobile,desktop}-{carga,error}-*.png` |
| Contraste | Script sobre el DOM renderizado: color de cada texto contra su fondo efectivo (mezclando capas con alfa) y opacidad heredada | §8.1 |
| Objetivos táctiles | Todo `button`/`role=*` interactivo visible con lado < 44 px | §8.3 |
| Foco y teclado | 18 Tab por pantalla en desktop: ¿cada elemento enfocado tiene `outline` o `box-shadow`? | §8.2 |
| Zoom 200 % | Viewport 720 × 450 (= 1440 × 900 al 200 %): desborde horizontal y qué queda sobre el pliegue | `zoom200/*.png` |
| Código | `web-design-guidelines` sobre `FamiliaHoy.js`, `ToastHost.js`, `EmergencyScreen.js`, `CalendarScreen.js` y `grep` puntuales | `archivo:línea` en cada hallazgo |

**Límites:** no se probó con NVDA, VoiceOver ni TalkBack (lo de lectores de pantalla sale del árbol de accesibilidad); no se probó
Android físico; el contraste de los placeholders no se midió (react-native-web no expone `::placeholder`). Los datos de las pruebas
se restauraron por SQL (ids 63 y 66).

---

## 2. Foco 1 · Marcar una dosis

### Crítica

**Primera impresión (2 s), `desktop/datos-familia.png`:** «Hoy en tu familia» es lo segundo que se ve, después de la bandera. Los
botones «Hecho» (salvia, 48 px) son lo más fuerte de la tarjeta. **Está bien: es la acción principal.** El problema no es la jerarquía:
es lo que pasa **después** del toque.

**Lo que funciona:** botones de 48 px con texto, no sólo ícono · `aria-label` específico («Marcar como hecho: Losartán de María Elena») ·
actualización optimista que **vuelve atrás** si el servidor falla (`FamiliaHoy.js:66-72`, verificado con la red cortada) · ícono + color + texto en cada tipo.

**Lo que no:** el gesto más frecuente del producto es irreversible, ambiguo con los vencidos y se comporta distinto según dónde se haga.

### Prueba en vivo (27/11, 23:17)

| Acción | Resultado observado | Evidencia |
|---|---|---|
| «Hecho» sobre «Losartán · Venció mar 24 · 08:00» | Desaparece al instante. Toast «Listo, lo marcaste como hecho», **sin botones**; a los 5 s ya no está | `auditoria/dosis-1-hecho-toast.png` |
| | En la base: id 63, `activo = f`, `fecha_hora` sigue siendo el 24/11 08:00 → el calendario muestra **✓ el martes 24** | SQL |
| «Más tarde» sobre «Losartán · Venció 08:00» (hoy) | Toast «Lo pasamos para dentro de una hora». **Desaparece de «Hoy»** | `auditoria/dosis-2-mas-tarde.png` |
| | En la base: id 66 pasó de `27/11 08:00` a **`28/11 00:17:51.217`**. El id 67 sigue en `28/11 08:00` → **dos dosis con 8 h de diferencia** | SQL |
| «Hecho» en el Calendario | Diálogo: «Va a dejar de figurar como pendiente. **Esto no se puede deshacer desde la app.** Sí, marcar como hecho / No, volver». Escape lo cierra ✓ | `auditoria/dosis-3-confirmacion-calendario.png` |
| «Hecho» con la red cortada | Vuelve atrás ✓. Toast «No pudimos conectarnos…» **con el check verde de éxito** | `auditoria/dosis-4-hecho-sin-red.png` |

### Hallazgos

| ID | Pantalla | Problema | Evidencia | Sev. | Propuesta |
|---|---|---|---|---|---|
| **DOS-01** | Familia › Hoy | «Más tarde» calcula `max(ahora, hora) + 1 h`. Sobre un vencido de la noche cruza la medianoche: la dosis de hoy pasa a mañana, sale de «Hoy» y de los vencidos, y queda pegada a la dosis siguiente de la serie (riesgo de **doble dosis**). Además guarda segundos y milisegundos (`00:17:51.217`) | `FamiliaHoy.js:83`; id 66 en la base; `dosis-2-mas-tarde.png` | **P0** | En los vencidos no ofrecer «Más tarde»: ofrecer **«Se dio»** / **«No se dio»**. En los de hoy, posponer nunca más allá de las 23:59 ni más cerca de 2 h de la próxima dosis de la serie. Redondear a minutos. El toast dice la hora nueva: «La pasamos a las 21:30» |
| **DOS-02** | Familia › Hoy, Calendario | «Hecho» es irreversible. En «Hoy», además, no tiene confirmación; el toast dura 2,6 s y tiene `pointerEvents="none"`, así que **no puede llevar un «Deshacer»** | `FamiliaHoy.js:63-77`; `ToastHost.js:17,60`; `CalendarScreen.js:241` | **P0** | Toast con acción **«Deshacer»** durante 8 s (y anunciado al lector de pantalla). `TODO(backend)`: endpoint para reactivar (`PATCH /recordatorios/:id/activar`) o aceptar `activo` en el `PATCH` |
| **DOS-03** | Familia › Hoy, Calendario | Marcar un vencido de hace días lo registra como cumplido en su día y hora originales. La adherencia ✓ ✕ del calendario queda **falsa** y no hay forma de decir «no se dio» | Id 63: marcado el 27, figura ✓ el 24 (`datos-calendario-mes.png`) | **P0** | Vencidos de más de 12 h: «¿Se la dieron?» → «Sí, a las [hora]» / «No se dio». `TODO(backend)`: `estado` (`pendiente`/`hecho`/`omitido`), `hecho_a`, `hecho_por` |
| DOS-04 | Hoy vs Calendario | La misma acción tiene dos comportamientos: un toque sin aviso en «Hoy» y un diálogo de «no se puede deshacer» en Calendario | `FamiliaHoy.js:147`, `CalendarScreen.js:238` | P1 | Unificar: un toque + toast con Deshacer en los dos. Sin diálogo |
| DOS-05 | Global (toasts) | Los errores muestran el **check verde de éxito**: ninguna de las 23 llamadas a `mostrarToast` pasa el tipo `'error'` | `ToastHost.js:67`; `grep` → 0/23; `dosis-4-hecho-sin-red.png` | P1 | Pasar `'error'` en todos los `catch`. Errores con ícono de alerta, texto en terracota oscuro y más tiempo en pantalla |
| DOS-06 | Familia | «Hoy» mezcla vencidos de otros días con los de hoy. La bandera dice «**3 dosis hoy**» y la tarjeta de María Elena «3 pendientes hoy», cuando hoy hay 2 | `FamiliaHoy.js:53` (filtra `fecha <= fin de hoy`), `FamilyListScreen.js:256`; `datos-familia.png` | P1 | Dos grupos: «**Hoy**» (sólo hoy) y «**Quedó sin marcar**» (días anteriores, con la fecha). Los contadores cuentan sólo hoy |
| DOS-07 | Familia › Hoy | «Venció **mar 24** · 08:00»: se lee como «24 de marzo» (es martes 24). Para P2 (cuidador mayor) es una trampa | `utils/avisos.js:41-47` (`weekday: 'short', day`) | P1 | «Venció el martes 24/11 · hace 3 días». Fechas relativas: «ayer», «hace 3 días», «mañana» |
| DOS-08 | Nuevo recordatorio | No hay campo para el **medicamento** ni la **dosis**. El título es la «Descripción (opcional)»; si queda vacía, el evento se llama «Recordatorio». De ahí salen los «Si» de la base | `FamiliaHoy.js:132` (`descripcion \|\| t.label`); journey J-B (`journey2-tras-guardar.png`) | P1 | Para Medicación: «Medicamento» (obligatorio) + «Dosis» (opcional). Título = «Losartán 50 mg». Para Turno: «¿Con quién / dónde?» |
| DOS-09 | Nuevo recordatorio | Desde Calendario arranca con **«Control»** marcado y ninguna persona elegida, aunque haya una sola | `datos-alta-recordatorio.png`; `journey2-form-desde-menu.png` | P1 | Sin tipo marcado (obligatorio elegir) o el del contexto. Persona preseleccionada si viene de su perfil o si hay una sola |
| DOS-10 | Nuevo recordatorio | Minutos en un select de 60 opciones. No se pueden poner varios horarios por día. La repetición es «cuántas veces» (máximo 100), no «hasta cuándo» | `AddReminderScreen.js`; `ar.yml` | P2 | Horarios rápidos (08:00 · 14:00 · 20:00) + «otro», minutos de a 5 o 15, «Hasta [fecha] / Sin fecha de fin» |
| DOS-11 | Notificación | Tocar una notificación abre el Calendario genérico, no la dosis con su «Hecho» | `App.js` (`navigationRef.navigate('Calendario')`) | P1 | Abrir el día con el evento resaltado y las acciones a mano |
| DOS-12 | Global (toasts) | 2,6 s es poco para leer «No pudimos conectarnos. Revisá tu conexión a internet y probá de nuevo.» (12 palabras) | `ToastHost.js:17` | P2 | Duración según el largo (≈ 1 s cada 4 palabras, mínimo 4 s); los errores se quedan hasta que se cierran |

---

## 3. Foco 2 · Emergencia

### Crítica

**Primera impresión de la ficha (`mobile/datos-emergencia.png`):** nombre en serif grande, «Tipo de sangre A+» en un bloque rosado,
alergias en chips y las notas («Tiene marcapasos desde 2021»). **El orden de lectura es el correcto** y es la mejor pantalla de la app.

**Lo que funciona:** teléfonos grandes y llamables, `aria-label` «Llamar a Mónica Argento», confirmación antes de borrar un contacto
(`EmergencyScreen.js:205`), «Copiar resumen».

**Lo que no:** llegar a la ficha es difícil (scroll, conexión), le falta lo que pregunta primero un médico («¿qué toma?») y mezcla
lectura con edición.

### Hallazgos

| ID | Pantalla | Problema | Evidencia | Sev. | Propuesta |
|---|---|---|---|---|---|
| **EME-01** | Arranque | Si `GET /api/familia/grupo` falla por **cualquier motivo que no sea 404** (sin red, servidor dormido en Render, timeout), `grupo` queda en `null`, se ignora el grupo guardado en la sesión y la app muestra **«Creá tu grupo familiar»**. Ninguna ficha es accesible y la persona puede creer que perdió todo | `AuthContext.js:60-67`; `auditoria/{mobile,desktop}-error-*.png` (las 6 capturas muestran el onboarding) | **P0** | Ante un error que no sea 404, usar `sesion.grupo` (ya se guarda en `saveSession`) y mostrar el banner «Sin conexión: estás viendo lo último que se cargó». Guardar en el dispositivo la última copia de las fichas de emergencia |
| EME-02 | Familia | La ficha se encuentra con scroll: en mobile el botón de María Elena está en **y = 1801 px** con un viewport de 844 (≈ 2 pantallas). No hay acceso fijo | Medición con Playwright; `mobile/datos-familia-completa.png` | P1 | Entrada fija **«Emergencia»** (en la barra inferior en mobile y en la barra lateral en desktop) → selector con las caras de la familia → ficha. Objetivo: 2 toques desde cualquier pantalla |
| EME-03 | Ficha | No muestra la **medicación actual** ni la **edad**. La medicación sólo aparece si alguien la escribió en «Notas» (el placeholder lo sugiere) aunque los tratamientos activos ya están cargados | `EmergencyScreen.js:295`; `datos-emergencia.png` | P1 | Bloque «Toma actualmente» con los tratamientos sin fecha de fin o con fin futuro. Edad junto al nombre: «79 años · marcapasos» |
| EME-04 | Ficha | Lápiz y tacho al lado de **cada** teléfono. En una emergencia, un toque de más abre el borrado (tiene confirmación, por eso no es P0) | `datos-emergencia.png`; foco: «Llamar a… → Editar contacto… → Eliminar contacto…» | P1 | **Modo lectura** por defecto: sólo «Llamar». Editar todo detrás de un único «Editar ficha» |
| EME-05 | Ficha (mobile) | El teléfono se corta en dos líneas: «+54 9 11 5555- / 1201» | `mobile/datos-emergencia.png` | P2 | Sin corte de línea en los números, `tabular-nums`, y si no entra, achicar el nombre antes que el número |
| EME-06 | Ficha | Doble acento: borde superior terracota de 4 px + tarjeta con sombra de papel; «DATOS MÉDICOS» y «CONTACTOS DE EMERGENCIA» en versalitas grises compiten con el contenido | `datos-emergencia.png` | P2 | Un solo acento. Títulos de sección en serif como el resto |
| EME-07 | Ficha | Los contactos no se pueden ordenar ni marcar como no vigentes («Rosa Benítez · Vecina (se mudó)» sigue en la lista) | Seed + `datos-emergencia.png` | P2 | Ordenar por arrastre o «subir»; el primero es el principal |
| EME-08 | Familia | Un perfil nuevo queda «Ficha al 0 %» y nada invita a completarla: la ficha va a estar vacía justo cuando haga falta | `journey4-tras-alta-dependiente.png` | P1 | Después de guardar: «¿Completamos la ficha de emergencia de Nélida?». En la tarjeta, «Completar ficha» como acción principal mientras esté incompleta |

---

## 4. Bugs que el prompt daba por detectados

| Bug | Estado verificado | ID |
|---|---|---|
| Eventos a las 02:00 | **Arreglado en código** (`220bce4`, la hora se guarda como instante ISO). Quedan 10 filas de prueba a las 05:00 UTC en el grupo 3 | SIS-04 |
| Títulos «Si» | **No es un mapeo roto:** es texto que tipeó alguien en Familia Acevedo. La causa de fondo sí es un problema (DOS-08) | SIS-04, DOS-08 |
| Rectángulo rosa sobre «Mi perfil» | **Confirmado.** Es la «cinta» decorativa `styles.cinta` | CTA-01 |
| «Hecho» activo en eventos futuros | **Arreglado** (`CalendarScreen.js:441`: los futuros sólo tienen Posponer y Editar) | — |
| Leyenda que mezcla tipo y sujeto, sin Vacuna | **Arreglado:** la leyenda es por tipo e incluye Vacuna. El filtro de sujeto tiene su propio problema | CAL-01 |
| Invitar desde el sidebar y desde la card | **Confirmado** (son 3 entradas, con 3 nombres) | FAM-08 |
| Dos «Ver calendario» | **Arreglado** (queda uno, `FamiliaHoy.js:103`) | — |
| «Próximos del mes» repite la grilla | **Arreglado** (la tarjeta ya no existe) | — |
| Bordes punteados en acciones reales | **Confirmado:** «Agregar contacto», «Cerrar sesión», «Agregar perfil sin cuenta» | CTA-04 |
| Doble acento de color | **Confirmado** en la ficha y en las tarjetas de integrante | EME-06, FAM-05 |
| Títulos serif y sans mezclados | **Confirmado** | VIS-01 |
| Grillas desbalanceadas | **Confirmado** en Cuenta desktop | CTA-03 |
| Texto secundario < 4.5:1 | **Casi todo pasa.** Fallan los días atenuados del calendario (4.40 y 2.71) y las iniciales ocre (4.17). El 4.49 sobre arena estimado en la Fase 0 **no apareció** en ningún texto renderizado | CAL-03, FAM-06 |

---

## 5. Sistema y estados

| ID | Pantalla | Problema | Evidencia | Sev. | Propuesta |
|---|---|---|---|---|---|
| SIS-02 | Calendario (carga) | Mientras carga, el resumen dice «**0** Turnos · **0** Vacunas · **No hay avisos este mes**» y la grilla aparece vacía: información falsa durante 6 s | `auditoria/desktop-carga-calendario.png` | P1 | Skeleton también en el resumen y en la grilla. Nunca mostrar «0» antes de tener los datos |
| SIS-03 | Global (teclado) | Después del menú de usuario hay un Tab que no enfoca nada visible (`document.activeElement = body`) en todas las pantallas | §8.2 | P2 | Buscar el elemento con `tabIndex` sin rol (probablemente el contenedor del scroll) |
| SIS-04 | Datos de demo | Serie «Si» a las 02:00 (10 filas, grupo 3 «Familia Acevedo»). Si se usa en la demo, parece un bug | SQL de la Fase 0 | P2 | Borrarla antes de la presentación (es dato, no código) |

## 6. Hallazgos por pantalla

### Familia

| ID | Problema | Evidencia | Sev. | Propuesta |
|---|---|---|---|---|
| FAM-01 | El dueño no queda como integrante al crear el grupo; «Mi ficha» se resuelve por coincidencia de nombre y apellido (con «Moni» no la encuentra) | `AccountScreen.js:220`; `vacio-familia.png` (0 integrantes) | P1 | Ofrecer «Sumarme como integrante» al crear el grupo. `TODO(backend)`: `Integrante.usuarioId` |
| FAM-02 | Familia vacía: «0 dosis hoy · 0 turnos esta semana · 0 fichas incompletas» | `vacio-familia.png` | P2 | Sin datos, no mostrar los chips: el estado vacío ya dice qué hacer |
| FAM-03 | En mobile, «Esta semana» queda al final, debajo de 8 tarjetas (y debajo del estado vacío cuando no hay datos) | `mobile/datos-familia-completa.png` | P2 | Subirla debajo de «Hoy» o sacarla en mobile (el Calendario ya la cubre) |
| FAM-04 | Celdas de la tira semanal de **36 × 88 px** en mobile (< 44 de ancho) | §8.3 | P1 | 7 columnas no entran en 390 px con 44 px y separación: scroll horizontal, o 5 días con el resto en el Calendario |
| FAM-05 | Doble acento en las tarjetas de integrante: barra lateral terracota + hoja de color/sombra. En «Hoy», además, hoja asomando + barra de categoría | `datos-familia.png` | P2 | Un acento por tarjeta: la hoja sólo en la protagonista («Hoy») |
| FAM-06 | Iniciales del avatar ocre («AA»): `#9A6B16` sobre `#FDF1D6` = **4.17:1** a 15 px | §8.1 | P2 | Oscurecer el texto a ≈ `#85561F` (`avatarAdultText`, que ya pasa) |
| FAM-07 | Truncados sin tooltip: «Levotiroxina en ayunas — Mónica · sáb …» | `mobile/datos-familia-completa.png` | P2 | `title`/tooltip en web; en la tarjeta, mostrar sólo el próximo evento corto |
| FAM-08 | Invitar tiene 3 entradas con 3 nombres: «Sumá a tu familia / Copiar código» (sidebar), «Integrante con cuenta · Invitalo con un código» (menú), «Invitar miembro» (Cuenta) | `datos-familia-menu-agregar.png`, `datos-cuenta.png` | P2 | Una acción, «Invitar a alguien», en el menú global y en Cuenta. El aviso del sidebar se va después de la primera invitación |

### Calendario

| ID | Problema | Evidencia | Sev. | Propuesta |
|---|---|---|---|---|
| CAL-01 | Filtro por persona: **dos «MA» idénticos** (María Elena y Mónica) y **tres patitas idénticas** (Fatiga, Dardo, Pelusa). Sin hover no se distinguen; en el celular no hay hover | `datos-calendario-mes.png` | P1 | Chips con avatar + **nombre** («María Elena», «Fatiga»). Si no entran: un selector «Todos ▾» |
| CAL-02 | Grilla de mes en desktop: los eventos se truncan a «↻08:…», sin título ni persona: no se lee qué se omitió en los días ✕ | `desktop/datos-calendario-mes.png` | P1 | En la celda: puntos de color + conteo («3») y el estado ✓ ✕; el detalle en el panel del día |
| CAL-03 | Contraste de los números de día: pasados del mes con `opacity .62` = **4.40:1**; otros meses con `.45` = **2.71:1** (17 px) | §8.1 | P1 | Atenuar con un color, no con opacidad: pasados `textBody` (≈ 7:1), otros meses `textMutedLight` (4.96:1) |
| CAL-04 | En mobile hay ≈ 520 px de controles antes del primer evento (título, flechas, Hoy, vistas, «…», «+ Agregar» y 3 filas de filtros). Al **200 %** no se ve ningún evento | `mobile/datos-calendario-mes.png`, `zoom200/calendario.png` | P1 | Una barra: mes + ‹ › + vista. Filtros detrás de «Filtrar (2)». «+ Agregar» como botón flotante |
| CAL-05 | Segmentado Mes/Semana/Lista de **42 px** de alto; chips de tipo de **40 px** | §8.3 | P1 | Alto mínimo de 44 px |
| CAL-06 | «+ Agregar» abre el formulario directo; en Familia abre un menú | `datos-alta-recordatorio.png` vs `datos-familia-menu-agregar.png` | P2 | El mismo `AddMenu` en todas las pantallas |
| CAL-07 | Calendario vacío: «No hay recordatorios en este período.» en una caja suelta, sin `EmptyState` ni acción | `mobile/vacio-calendario-mes.png` | P2 | `EmptyState` con ilustración y «Programar el primero» |

### Cuenta

| ID | Problema | Evidencia | Sev. | Propuesta |
|---|---|---|---|---|
| CTA-01 | «Cinta» rosa recortada sobre «Mi perfil»: se lee como un rectángulo cortado, no como cinta | `AccountScreen.js:494, 1107`; `datos-cuenta.png` | P2 | Sacarla. Si se quiere el gesto, que sea una cinta translúcida rotada y con bordes dentados |
| CTA-02 | «Grupo familiar · **2 integrantes**» (personas con cuenta) contra «**5 integrantes**» en Familia (personas cuidadas) | `datos-cuenta.png`, `datos-familia.png` | P1 | «2 personas con acceso» · «5 integrantes». Se fija en el glosario de la Fase 5 |
| CTA-03 | Grilla desbalanceada en desktop: hueco de ≈ 215 px debajo de «Acceso y seguridad» | `desktop/datos-cuenta-completa.png` | P2 | Reordenar: Mi perfil + Mi ficha (protagonista) a la izquierda; Grupo + Privacidad a la derecha; Preferencias a lo ancho |
| CTA-04 | Bordes punteados en acciones reales: «Cerrar sesión» (`AccountScreen.js:1228`), «Agregar perfil sin cuenta», «Agregar contacto» (`EmergencyScreen.js:533`); divisores y banner punteados (`AccountScreen.js:1058, 1059, 1082`) | `grep borderStyle: 'dashed'` (10 usos) | P2 | El punteado sólo en `EmptySlot` (casilla para agregar). Acciones con borde sólido; divisores sólidos al 8 % |
| CTA-05 | «Eliminar a José»: ícono de **40 × 48 px** | §8.3 | P2 | 44 × 44 mínimo |
| CTA-06 | Desborde horizontal interno: un contenedor de 1500 px en 1440 y de 780 px en 720 (zoom 200 %) | §8.4 | P2 | Ubicarlo (probablemente la marca de agua de fondo) y recortarlo con `overflow: hidden` |
| CTA-07 | Sólo hay `dueno` y `miembro`: quien se une con código puede borrar integrantes y fichas. No existe «sólo mirar» (persona P3) | `TODO_BACKEND_REDISENO.md` | P2 | `TODO(backend)`: rol `lector`. En la interfaz: elegir el rol al invitar |

### Formularios, autenticación y detalle

| ID | Pantalla | Problema | Evidencia | Sev. | Propuesta |
|---|---|---|---|---|---|
| FRM-01 | Crear cuenta | Requisitos de la contraseña comunicados **sólo por color**: «mirá los que siguen en gris debajo» | Snapshot del registro (journey J-A) | P1 · WCAG 1.4.1 | Cada requisito con ícono ✓/○ y estado en texto («Cumple» / «Falta») |
| FRM-02 | Alta de integrante | No pide parentesco (CU4 lo pide) ni ofrece seguir con los datos de emergencia | `AddMemberScreen.js`; journey J-D2 | P2 | Paso 2 opcional «Para una emergencia» |
| FRM-03 | Detalle | `toSentenceCase` pasa a minúsculas siglas y marcas: «Neumococo (VNC20)» → «Neumococo (**vnc20**)» | `ProfileDetailScreen.js:113, 149`; `datos-detalle-integrante-mayor.png` | P2 | Mostrar el texto como se guardó; capitalizar sólo la primera letra si está toda en minúscula |
| FRM-04 | Bienvenida | Las 3 tarjetas de beneficio son botones y compiten con «Crear cuenta» | Árbol de accesibilidad: 3 `button` «Ficha de emergencia…», «Calendario compartido…», «Personas y mascotas…» | P2 | Que sean contenido (no `button`), o que lleven a una sección concreta |
| FRM-05 | Nuevo recordatorio | La API rechaza fechas pasadas: no se puede cargar «ya se la di» ni un tratamiento que empezó ayer | `recordatoriosController.js:74` | P2 | `TODO(backend)`: permitir pasado para registros de toma (no para avisos) |

### Visual y consistencia

| ID | Problema | Evidencia | Sev. | Propuesta |
|---|---|---|---|---|
| VIS-01 | Títulos en serif (Familia, Calendario, Cuenta, Emergencia) y en sans 600 (Detalle, Alta de integrante, Nuevo recordatorio, formularios de salud). `ScreenHeader` lo usan sólo 2 pantallas | `datos-detalle-integrante-mayor.png`, `datos-alta-recordatorio.png`; `grep SERIF_BOLD` | P2 | `ScreenHeader` con título serif en todas las pantallas |
| VIS-02 | La escala de espaciado existe (`spacing.js`: 8/12/16/24) pero casi no se usa; no hay tokens de radio ni de tamaño de texto. Cada pantalla tiene sus `fontSize` y `padding` | `theme/spacing.js`, `theme/typography.js` | P2 | Escalas `space`, `radius`, `text` en el theme (Fase 4) y reemplazo progresivo |
| VIS-03 | Dos archivos de tokens papercut (`paper.js` y `papel.js`) y nombres que mienten (`lime` = terracota, `glassFillStrong` = blanco) | `theme/` | P2 | Unificar en `papel.js`; alias con los nombres viejos para no romper imports |

---

## 7. Heurísticas de Nielsen

| # | Heurística | Estado | Hallazgos |
|---|---|---|---|
| 1 | Visibilidad del estado del sistema | 🟠 | SIS-02 (muestra «0» mientras carga), DOS-05 (error con check de éxito), EME-01 (sin red parece que no hay familia) |
| 2 | Relación con el mundo real | 🟠 | DOS-07 («mar 24»), DOS-10 («cuántas veces»), CTA-02 («integrantes» con dos sentidos) |
| 3 | Control y libertad | 🔴 | DOS-02 (sin deshacer), DOS-03 (sin «no se dio») |
| 4 | Consistencia y estándares | 🟠 | DOS-04, CAL-06, FAM-08, VIS-01, CTA-04 |
| 5 | Prevención de errores | 🔴 | DOS-01 (posponer cruza la medianoche), DOS-08 (medicación sin nombre), DOS-09 (tipo «Control» por defecto), EME-04 |
| 6 | Reconocer antes que recordar | 🟠 | CAL-01 (avatares iguales), EME-02 (hay que recordar dónde está la ficha) |
| 7 | Flexibilidad y eficiencia | 🟡 | DOS-10 (sin horarios rápidos), DOS-11 (la notificación no lleva a la acción) |
| 8 | Diseño estético y minimalista | 🟡 | CAL-04, FAM-02, FAM-05, EME-06, CTA-01 |
| 9 | Ayudar a reconocer y recuperarse de errores | 🟡 | Los textos de error dicen qué hacer («Revisá tu conexión… probá de nuevo») ✓, pero DOS-05 y FRM-01 |
| 10 | Ayuda y documentación | 🟢 | «Ayuda rápida» en Cuenta (cómo invitar, cómo usar la ficha) |

🔴 problema serio · 🟠 varios problemas · 🟡 menores · 🟢 bien.

---

## 8. Accesibilidad (WCAG 2.1 AA)

**Resumen:** la base es buena: foco visible en todo, `aria-label` descriptivos, `lang="es"`, «Saltar al contenido», escala de
texto, movimiento reducido y toasts con `aria-live`. Las fallas se concentran en el **tamaño de los objetivos del Calendario**, en
**atenuar con opacidad** y en **comunicar sólo con color**.

### 8.1 Contraste (medido sobre lo renderizado)

| Elemento | Texto | Fondo | Ratio | Requerido | ¿Pasa? |
|---|---|---|---|---|---|
| Texto secundario (`textMutedLight`) | `#726A5D` | `#FBF6EE` | 4.96:1 | 4.5:1 | ✅ |
| Texto de cuerpo (`textBody`) | `#574E49` | `#FBF6EE` | ≈ 7:1 | 4.5:1 | ✅ |
| Hora vencida en «Hoy» | `#9A3416` | `#FFFDF9` | > 7:1 | 4.5:1 | ✅ |
| Iniciales de avatar ocre («AA») | `#9A6B16` | `#FDF1D6` | **4.17:1** | 4.5:1 | ❌ FAM-06 |
| Días pasados del mes (opacidad .62) | `#2A2421` al 62 % | `#FFFDF9` | **4.40:1** | 4.5:1 | ❌ CAL-03 |
| Días de otros meses (opacidad .45) | `#2A2421` al 45 % | `#FFFDF9` | **2.71:1** | 4.5:1 | ❌ CAL-03 |
| Íconos terracota sobre rosado (no texto) | `#C24623` | `#FAECE7` | 4.34:1 | 3:1 (1.4.11) | ✅ |
| Ícono de teléfono blanco sobre terracota (no texto) | `#FFFFFF` | `#D9603A` | 3.69:1 | 3:1 | ✅ |
| Tacho «Eliminar» (no texto) | `#E85D04` | `#FFFDF9` | 3.45:1 | 3:1 | ✅ (justo) |

### 8.2 Teclado y foco

| Comprobación | Resultado |
|---|---|
| Foco visible (18 Tab por pantalla en Familia, Calendario, Cuenta, Emergencia, Detalle y Nuevo recordatorio) | ✅ Todos los elementos enfocados tienen anillo (`outline` o `box-shadow`) |
| Orden | ✅ Saltar al contenido → navegación → contenido, de arriba a abajo |
| Tab perdido | ❌ Un Tab sin destino visible después del menú de usuario (SIS-03) |
| Diálogo de confirmación | ✅ Escape lo cierra |
| Acciones de la ficha | ⚠️ Llamar → Editar → Eliminar por cada contacto: 3 tabs por persona; con 3 contactos hay 9 paradas antes de terminar (EME-04) |
| Gestos | ⚠️ Borrar una serie entera desde el Calendario se ofrece en un long-press (`CalendarScreen.js:247`); desde Editar existe el botón, pero no está claro si borra la serie |

### 8.3 Objetivos táctiles (< 44 px)

| Pantalla | Elemento | Tamaño | ID |
|---|---|---|---|
| Familia (mobile) | 7 celdas de la tira semanal | 36 × 88 | FAM-04 |
| Calendario | Mes / Semana / Lista | 62 × 42 · 91 × 42 · 66 × 42 | CAL-05 |
| Calendario | Chips Medicación / Turno / Vacuna | 129 × 40 · 150 × 40 · 100 × 40 | CAL-05 |
| Cuenta | Eliminar a José | 40 × 48 | CTA-05 |
| Emergencia, Detalle, Nuevo recordatorio | — | ✅ todos ≥ 44 | — |

### 8.4 Zoom 200 % (720 × 450 CSS px)

| Pantalla | Desborde horizontal | Sobre el pliegue | Nota |
|---|---|---|---|
| Familia | No | Bandera + 1 alerta; **ninguna acción de «Hoy»** | La barra inferior ocupa 68 de los 450 px |
| Calendario | No | **Sólo controles, ningún evento** | CAL-04 |
| Cuenta | Interno (780 > 720) | Mi perfil | CTA-06 |
| Emergencia, Detalle, Nuevo recordatorio | No | Bien | — |

El contenido refluye bien (1.4.10 ✅). El problema es de jerarquía: a 200 % lo importante queda debajo del pliegue.

### 8.5 Lector de pantalla (por el árbol de accesibilidad, sin AT real)

| Elemento | Se anuncia como | Problema |
|---|---|---|
| «Hecho» en «Hoy» | «Marcar como hecho: Losartán de María Elena, botón» | ✅ (pero si no hay descripción: «Marcar como hecho: Medicación», DOS-08) |
| Celda de la tira semanal | «vie 27: 3 pendientes, botón» | ✅ |
| Toast | `role="alert"` + `aria-live="polite"` | ⚠️ `alert` ya es asertivo: elegir uno. Los errores con «polite» pueden no leerse a tiempo |
| Alertas de Familia | Toda la lista en un `role="alert"` (`FamiliaHoy.js:210`) | ⚠️ Se vuelve a anunciar en cada recarga. Usar `role="status"` o anunciar sólo lo nuevo |
| Filtros de persona del Calendario | «MA» (×2), ícono de pata (×3) | ⚠️ Revisar que el `aria-label` tenga el nombre completo (CAL-01) |
| Ilustraciones | `aria-label` descriptivos («Abuelos, una nena y su perro…») | ✅ |

---

## 9. Lo que funciona bien (y hay que cuidar)

- **La ficha de emergencia** tiene el orden de lectura correcto y teléfonos grandes y llamables.
- **Actualizaciones optimistas con vuelta atrás** si falla el servidor («Hecho», borrados).
- **Foco visible en el 100 %** de lo recorrido, «Saltar al contenido», `lang="es"`.
- **`aria-label` específicos** («Marcar como hecho: Losartán de María Elena», «Llamar a SAME»).
- **Tamaño de texto ×1,15 / ×1,3** global para baja visión.
- **Plurales correctos** («1 recordatorio vencido», «2 recordatorios vencidos»).
- **«Hecho» ya no aparece en eventos futuros** y la leyenda del calendario es por tipo, con Vacuna.
- **Unirse con código antes de registrarse** guarda el código y lo aplica después: flujo bien pensado.
- Copy con voseo, cálido y con el paso siguiente en los errores («Revisá tu conexión… probá de nuevo»).

## 10. Orden recomendado para la implementación (Fase 6)

1. **P0 (antes que nada, son cambios chicos y de front salvo lo marcado):**
   - EME-01 · usar el grupo guardado ante un error de red + banner «Sin conexión».
   - DOS-01 · en vencidos, «Se dio» / «No se dio»; posponer sin cruzar la medianoche ni pisar la próxima dosis.
   - DOS-02 · toast con «Deshacer» (`TODO(backend)`: reactivar).
   - DOS-03 · marcar un vencido pregunta si se dio (`TODO(backend)`: `estado`, `hecho_a`, `hecho_por`).
2. **P1 de las áreas críticas:** DOS-05, DOS-06, DOS-07, DOS-08, DOS-09, EME-02, EME-03, EME-04, EME-08.
3. **P1 de accesibilidad:** CAL-03, CAL-05, FAM-04, FRM-01.
4. **P1 restantes:** CAL-01, CAL-02, CAL-04, CTA-02, FAM-01, SIS-02, DOS-11, DOS-04.
5. **P2** durante el pulido, empezando por lo visual (VIS-01, CTA-04, FAM-05/EME-06), que entra con los tokens de la Fase 4.
