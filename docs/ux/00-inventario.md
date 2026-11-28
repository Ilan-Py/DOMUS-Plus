# 00 · Inventario de DOMUS+ (Fase 0)

> Review UI/UX end to end. Fase 0: contexto, sin skills.
> Fecha: 27/11/2026 · Rama: `feature/familia-hoy` (base `87fb3b6`) · Capturas en `docs/ux/capturas/antes/`.

## 0. Punto de partida (importante)

Esta revisión **no parte de cero**. La rama ya tiene una primera pasada del rediseño papercut, hecha hoy en 6 commits:

| Commit | Qué trajo |
|---|---|
| `854cd7a` | Tokens papercut (`theme/papel.js`), `PaperCard` con sombras de papel apilado y hoja de color |
| `454ecde`, `0393a20`, `ae66729` | Familia: «Hoy» accionable, tira semanal, alertas, menú «+ Agregar», tarjetas ricas, bandera recortada |
| `44fcca8` | Calendario: vistas Mes/Semana/Lista, filtros por integrante y tipo, pendientes sin marcar, resumen |
| `87fb3b6` | Cuenta: tarjetas de papel, casillas vacías, confirmación por nombre |
| `220bce4` | Hora de recordatorios guardada como instante ISO (arregla el corrimiento de zona horaria) |

Además existe `docs/TODO_BACKEND_REDISENO.md` con lo que el rediseño pide y el backend no tiene. Esta revisión se apoya en
ese trabajo: lo audita sobre la app renderizada y lo completa. No se reescribe.

## 1. Stack detectado

| Capa | Tecnología |
|---|---|
| App | Expo SDK 51, React Native 0.74.5, React 18.2, **react-native-web 0.19** (se prueba en web y Android) |
| Navegación | React Navigation 6: 3 ramas (`boot` / `auth` / `onboarding` / `main`) elegidas en `App.js`; tabs + native-stack |
| Layout | ≥ `SIDEBAR_BREAKPOINT` → `SideBar` lateral de 248 px; debajo → `BottomTabBar` (Familia · Calendario · Cuenta) |
| Estilos | `StyleSheet` + tokens en `src/theme/` (sin Tailwind ni styled-components). CSS inyectado en web por `injectPaperCss()` |
| Tipografía | Plus Jakarta Sans 400/500/600 (UI, default global vía `Text.defaultProps`) + **Lora 700** (`SERIF_BOLD`, títulos) |
| Íconos | `@expo/vector-icons` → Ionicons outline (un solo set) + ilustraciones SVG con `react-native-svg` |
| Estado | Contextos: `AuthContext`, `FamilyContext`, `PreferenciasContext` (escala de texto, avisos anticipados) |
| Datos | Axios (`api/client.js`) contra API Express + Prisma + PostgreSQL (Docker), respuestas en snake_case |
| Tests / lint / TS | No hay. Verificación manual + Postman |

## 2. Skills

`/plugin` es un comando interactivo del usuario: no lo puedo correr yo. Las skills disponibles en esta sesión son:

| Pedida en el prompt | Estado | Uso |
|---|---|---|
| `design:user-research`, `design:research-synthesis` | ✅ activas | Fase 1 |
| `design:design-critique`, `design:accessibility-review` | ✅ activas | Fases 2 y 7 |
| `design:design-system` | ✅ activa | Fase 4 |
| `design:ux-copy` | ✅ activa | Fase 5 |
| `design:design-handoff` | ✅ activa | Fase 8 |
| `design-skills:journey-mapping`, `interaction-design`, `design-elevation`, `accessibility-audit` | ❌ no instaladas | Se aplica el criterio a mano dentro de `design:*` |
| `ui-review` | ❌ no instalada | Reemplazo: `web-design-guidelines` (revisión contra las Web Interface Guidelines) |
| — | ✅ `playwright-cli` | Capturas, journeys contados, foco/teclado, zoom 200 % |

`design-taste-frontend` también está, pero apunta a sitios de marketing; no aplica a una app de datos de salud.

## 3. Cómo se sacaron las capturas

- Navegador: Edge (Chromium) con `playwright-cli`, contra `expo start --web` (`:8081`) y la API en Docker (`:3000`).
- Tamaños: **desktop 1440×900**, **tablet 834×1112**, **mobile 390×844**. Cada pantalla tiene la vista «sobre el pliegue» y, si
  scrollea, una `-completa.png` (el viewport se estira al alto del contenido, porque react-native-web scrollea dentro de un `div`).
- 111 capturas. Nombres: `<tamaño>/<estado>-<pantalla>[-completa].png` con estado `auth`, `onboarding`, `datos` o `vacio`.

### Datos usados

| Estado | Cuenta | Contenido |
|---|---|---|
| Con datos | `monica@domus.test` (dueña) · Familia Argento | 5 integrantes: Mónica (41, adulta, con cuenta), José (44, adulto, con cuenta), Paola (19), **Alfio (9, menor)**, **María Elena (79, mayor, sin cuenta, marcapasos)** · 3 mascotas: Fatiga (perro), Dardo (gato), Pelusa (conejo) · vacunas con próxima dosis, profesionales, contactos de emergencia |
| Vacío | `lucia.vacia@domus.test` · Familia Ferreyra (creada para esta fase) | Grupo sin integrantes, mascotas ni recordatorios |

El seed (`prisma/seed.js`) tiene fechas relativas al momento en que se cargó, así que «Hoy» estaba vacío. Para que las capturas
muestren el caso real se agregaron por SQL, **sólo en la base local**, 39 recordatorios del grupo 4:

- **Losartán de María Elena**: diario 08:00, del 20/11 al 10/12 (serie ↻). Pasados marcados como hechos salvo el **martes 24 y hoy**:
  quedan vencidos sin marcar (sirven para ✓ ✕ y «Pendientes sin marcar»).
- **Levotiroxina en ayunas — Mónica**: diario 07:00, del 23/11 al 07/12, todo lo pasado hecho.
- Sueltos: gotas para los ojos de María Elena hoy 23:30, odontóloga de Paola mañana 10:00, desparasitación de Dardo el lunes 30.

La API no acepta recordatorios en el pasado (`recordatoriosController.js:74`), por eso se cargaron por SQL. El seed y el código no se tocaron.

## 4. Mapa de pantallas

```
App.js ─┬─ boot ─────────── SplashScreen (logo con latido)
        ├─ auth ─────────── AuthStack
        │                     ├─ Welcome        (WelcomeScreen, 620 l.)  ← inicial
        │                     ├─ Login          (LoginScreen)
        │                     └─ Register       (RegisterScreen)
        ├─ onboarding ───── GroupSetup         (crear grupo | unirme con código)
        ├─ main ─────────── MainTabs (SideBar ≥ breakpoint | BottomTabBar)
        │   ├─ Familia ──── FamiliaStack
        │   │                 ├─ FamilyList      (FamilyListScreen 686 l. + FamiliaHoy) ← home
        │   │                 ├─ ProfileDetail   (integrante o mascota: Vacunas / Tratamientos / Historial + Emergencia + Profesionales)
        │   │                 ├─ Emergency       (ficha de emergencia, 702 l.)
        │   │                 ├─ AddMember       (modal: integrante o mascota, alta y edición)
        │   │                 ├─ AddVaccine      (modal)
        │   │                 └─ AddTreatment    (modal)
        │   ├─ Calendario ─ CalendarioStack
        │   │                 ├─ Calendar        (CalendarScreen 880 l. + CalendarioVistas + MiniCalendar)
        │   │                 └─ AddReminder     (modal, 495 l.)
        │   └─ Cuenta ───── AccountScreen (1313 l., una sola pantalla con secciones)
        └─ (web) ────────── NotFoundScreen si la URL no es "/"
Globales: DialogHost (confirmaciones/menús), ToastHost (toasts), ConfirmModal/StickerConfirm.
```

| Pantalla | Archivo | Capturas | Qué resuelve hoy |
|---|---|---|---|
| Bienvenida | `screens/WelcomeScreen.js` | `auth-bienvenida` | Hero con ilustración y 3 tarjetas de beneficio; CTA crear cuenta / iniciar sesión / tengo un código |
| Iniciar sesión | `screens/LoginScreen.js` | `auth-login`, `auth-login-error-vacio` | Email + contraseña, mostrar contraseña, «¿Olvidaste…?», unirme con código |
| Crear cuenta | `screens/RegisterScreen.js` | `auth-registro` | Nombre, apellido, email, contraseña. No devuelve token: hace login después |
| Crear o unirse a grupo | `screens/GroupSetupScreen.js` | `onboarding-grupo` | Segmentado Crear grupo / Unirme con código, cerrar sesión |
| Familia (home) | `screens/FamilyListScreen.js`, `components/FamiliaHoy.js` | `datos-familia*`, `vacio-familia*` | Bandera con 3 stats + «+ Agregar», alertas, «Hoy en tu familia», «Esta semana», integrantes, mascotas, slots vacíos |
| Detalle de integrante/mascota | `screens/ProfileDetailScreen.js` | `datos-detalle-integrante-mayor`, `datos-detalle-mascota` | Pestañas Vacunas/Tratamientos/Historial con adjuntos; panel de emergencia y profesionales |
| Ficha de emergencia | `screens/EmergencyScreen.js` | `datos-emergencia` | Sangre, alergias, notas, contactos llamables, copiar resumen, editar |
| Alta / edición de integrante o mascota | `screens/AddMemberScreen.js` | `datos-alta-integrante` | Formulario con avatar de papel |
| Alta de vacuna / tratamiento | `AddVaccineScreen.js`, `AddTreatmentScreen.js`, `healthFormShared.js` | — (se llega desde el detalle) | Formularios con adjuntos |
| Calendario | `screens/CalendarScreen.js`, `components/CalendarioVistas.js`, `MiniCalendar.js` | `datos-calendario-{mes,semana,lista}`, `vacio-calendario-*` | Mes/Semana/Lista, filtros, agenda del día, pendientes sin marcar, exportar `.ics` (menú «…») |
| Nuevo recordatorio | `screens/AddReminderScreen.js` | `datos-alta-recordatorio` | Para quién, tipo, fecha, hora, descripción, repetición |
| Mi cuenta | `screens/AccountScreen.js` | `datos-cuenta*`, `vacio-cuenta*` | Perfil, mi ficha (% completitud), acceso, grupo y miembros, invitar, perfil sin cuenta, privacidad, preferencias, ayuda, zona de peligro |
| 404 | `screens/NotFoundScreen.js` | — | Volver al inicio |

Sin captura en esta fase: alta de vacuna y tratamiento, edición, estados de carga (skeleton) y error de red. Se cubren en la Fase 2
porque requieren forzar el estado (red cortada, latencia).

## 5. Flujos existentes

Pasos contados en la app real o leídos del código. Son la línea de base para la Fase 7.

| # | Flujo | Camino actual | Pasos |
|---|---|---|---|
| F1 | Onboarding y crear la familia | Bienvenida → Crear cuenta → (form 4 campos) → login automático → GroupSetup → nombre del grupo → Crear grupo → Familia vacía → «Agregar un familiar» | 6 pantallas |
| F2 | Medicación recurrente | Familia → «+ Agregar» → Medicación → AddReminder: persona, tipo, fecha, hora (2 selects), descripción, repetir → Guardar | 1 menú + 1 form con 7 decisiones |
| F2b | Marcar la toma | Familia → «Hoy» → **Hecho** (1 click, sin confirmación) · o Calendario → día → Hecho (con confirmación) | 1 a 3 |
| F3 | Emergencia | Familia → botón «Emergencia» de la tarjeta → ficha | **2 clicks** desde la home; no hay acceso desde Calendario ni Cuenta (salvo «Mi ficha») |
| F4a | Invitar a un familiar | Sidebar «Copiar código» (1 click) · o Cuenta → Invitar miembro → generar/copiar · o «+ Agregar» → Integrante con cuenta | 1 a 3 |
| F4b | Perfil dependiente (sin cuenta) | «+ Agregar» → Perfil sin cuenta → AddMember · o slot «Agregar persona» · o Cuenta → Agregar perfil sin cuenta | 2 |
| F5 | Sumar mascota | «+ Agregar» → Mascota · o slot «Agregar mascota» | 2 |
| F6 | Vacuna | Detalle → pestaña Vacunas → «+ Agregar vacuna» · o «+ Agregar» → Vacuna | 2 a 3 |

## 6. Componentes detectados

`n` = cantidad de archivos que lo importan (pantallas, navegación y otros componentes).

### Base y formularios
| Componente | n | Nota |
|---|---|---|
| `PressScale` | 29 | Pressable con escala; base de casi todos los interactivos |
| `PrimaryButton` | 19 | Variantes primaria/secundaria |
| `ErrorBanner` | 14 | Error de pantalla con reintento |
| `FormField` / `AppTextInput` | 12 | Input con label, error y foco al primer error (`useFirstErrorFocus`) |
| `EntityAvatar` / `Avatar` / `AvatarPicker` | 9 / – / 2 | Avatares de papel por integrante o especie |
| `Skeleton` | 8 | Estado de carga |
| `FadeSlideIn`, `Pulse`, `Blob` | 7 / 4 / 1 | Motion; respetan `useReducedMotion` |
| `InlineError` | 5 | Error de campo |
| `SegmentedControl` | 4 | Pestañas segmentadas (detalle, vistas de calendario, tamaño de texto) |
| `OptionPicker`, `DatePickerField`, `CheckboxField` | 4 / 4 / 1 | Selectores |
| `ScreenHeader` | **2** | Sólo lo usan `AddMember` y los forms de salud. Calendario, Detalle, Emergencia y Cuenta arman su propio header |
| `EmptyState` | 2 | Pocas pantallas lo usan; Calendario vacío muestra un texto suelto |
| `DeleteLink`, `CodigoExpandible`, `CrossfadeIcon` | 2 / 1 / – | |

### Papercut
| Componente | n | Nota |
|---|---|---|
| `PaperCard` | 4 | Tarjeta con sombra de papel apilado y hoja de color opcional |
| `PaperCutout` | 5 | Recortes decorativos |
| `BannerRecortes` | 1 | Bandera de Familia con borde cortado |
| `CasaRecorte`, `FamilyDoodles` | 1 / 4 | Ilustraciones SVG (casa, arcoíris, plantas) |
| `SlotVacio` | 2 | Casilla punteada para agregar |
| `StickerConfirm`, `ConfirmModal` | 1 / 1 | Modales con stickers de papel |

### Dominio
| Componente | n | Nota |
|---|---|---|
| `FamiliaHoy` | 1 | «Hoy» + «Esta semana» en Familia |
| `Evento` | 2 | Fila de evento (tipo, hora, avatar, recurrencia, hecho) |
| `CalendarioVistas`, `MiniCalendar` | 1 / 3 | Grilla de mes y semana |
| `RadialFab` | 1 | Menú «+ Agregar» |
| `EmergencySummary` | 1 | Resumen de emergencia en el detalle |
| `AttachmentsSection`, `ProfessionalContactsSection` | 1 / 1 | Adjuntos y profesionales |
| `AuthLayout`, `Logo` | 2 / – | Layout de bienvenida, login y registro |
| `DialogHost`, `ToastHost` | global | Confirmaciones (`confirm.js`) y toasts |
| `BlobSpinner` | **0** | Sin uso: candidato a borrar |

Componentes que pide la Fase 4 y **no existen todavía** con ese nombre: `PaperBanner` (hoy `BannerRecortes`), `EmptySlot` (hoy
`SlotVacio`), `Toast` (hoy `ToastHost`), `AddMenu` (hoy `RadialFab` + menú en Familia), `MemberCard`, `PetCard` y `StatChip`
(hoy son estilos inline dentro de `FamilyListScreen`). `EventItem` ≈ `Evento`.

## 7. Theme

| Archivo | Contenido | Observación |
|---|---|---|
| `theme/colors.js` (269 l.) | Paleta «hogareño»: `bgBase #FBF6EE`, `ink #2A2421`, `accentStrong #C24623`, `salvia #4A6B5D`, `ocre #C88D32`… | Nombres heredados que ya no describen el valor (`lime` = terracota, `glassFillStrong` = blanco). Comentarios con historia de 2 migraciones |
| `theme/papel.js` | Tokens papercut: cartulina, hojas de color, `SOMBRA_PAPEL` 1–3 (web) y `SOMBRA_NATIVA` | Mantiene los colores actuales en lugar de los del prompt (`#C24623` vs `#C4472B`, etc.) para no romper el contraste ya validado |
| `theme/paper.js` | CSS web inyectado: grano, tarjetas flotantes, paper-pop | **Duplica** el nombre con `papel.js`; conviene unificarlos |
| `theme/typography.js` | `poppinsWeight()` (nombre histórico, hoy es Plus Jakarta Sans) y `SERIF_BOLD` | Sin escala de tamaños: cada pantalla define `fontSize` suelto |
| `theme/spacing.js` | `SPACING` sm 8 / md 12 / lg 16 / xl 24 y `layout.screenTopPadding` | Escala corta, **casi sin uso**: las pantallas usan números sueltos. No hay tokens de radio |
| `theme/escalaTexto.js` | Parche global de `Text`/`TextInput` para «Tamaño de texto» (1 / 1,15 / 1,3) | Bueno para baja visión |
| `theme/avatars.js` | Catálogo de avatares de papel | |

Serif (`SERIF_BOLD`) aparece en Familia, Calendario, Cuenta, Emergencia, Bienvenida y Login. **No** en Detalle, AddMember,
AddReminder ni los forms de salud (título en sans 600, ver `datos-detalle-integrante-mayor.png`, `datos-alta-recordatorio.png`).

## 8. Primeras observaciones sobre las capturas

No es la auditoría (eso es la Fase 2), pero estos datos cambian el plan y conviene tenerlos ya.

### Estado de los bugs que el prompt da por detectados

| Bug del prompt | Estado hoy | Evidencia |
|---|---|---|
| Eventos a las 02:00 | **Arreglado en código** (`220bce4`). Lo que queda son datos viejos de prueba | 10 recordatorios «Si» a las 05:00 UTC (= 02:00 ART) en Familia Acevedo (grupo 3), del 28/11 al 07/12 |
| Títulos «Si» | **Es un dato de prueba, no un mapeo roto.** Pero muestra un problema real: el título del evento es la descripción libre, sin validar | Misma serie del grupo 3 |
| Rectángulo rosa cortado sobre «Mi perfil» | **Sigue** (es una «cinta» decorativa que se lee como un error) | `desktop/datos-cuenta.png`, arriba a la izquierda de «Mi perfil» |
| «Hecho» activo en eventos futuros | **Arreglado** en Calendario (`CalendarScreen.js:441`). En «Hoy» sólo hay eventos de hoy o vencidos | `desktop/datos-calendario-mes.png` |
| Leyenda que mezcla tipo y sujeto, sin Vacuna | **Arreglado**: leyenda de tipo con Vacuna, filtro de sujeto aparte | idem |
| Invitar desde sidebar y desde card | **Sigue**: sidebar «Sumá a tu familia», Cuenta «Invitar miembro», menú «+ Agregar → Integrante con cuenta» | `desktop/datos-familia-menu-agregar.png`, `datos-cuenta.png` |
| Dos «Ver calendario» / «Próximos del mes» repite la grilla | **Arreglado**: queda un solo «Ver calendario» (`FamiliaHoy.js:103`); «Próximos del mes» ya no existe | `grep` sin resultados |
| Bordes punteados en acciones reales | **Sigue**: «Agregar contacto» (`EmergencyScreen.js:533`), «Cerrar sesión» (`AccountScreen.js:1228`), divisores y banner de grupo (`AccountScreen.js:1058-1082`) | `datos-emergencia.png` |
| Doble acento (borde superior + lateral) | **Sigue** en Emergencia (borde superior terracota) y en las tarjetas de Familia (barra lateral + hoja de color asomando) | `datos-emergencia.png`, `datos-familia.png` |
| Títulos serif y sans mezclados | **Sigue** (ver §7) | |
| Grillas desbalanceadas | **Sigue** en Cuenta desktop: hueco de ~220 px debajo de «Acceso y seguridad» | `desktop/datos-cuenta-completa.png` |
| Texto secundario < 4.5:1 | **Parcial**: `textMutedLight #726A5D` da 4.96:1 sobre `bgBase`, pero **4.49:1 sobre `arena #F3EAE0`** (falla AA por poco). Falta medir los grises de la grilla en la Fase 2 | Cálculo de luminancia relativa |

### Problemas nuevos que aparecieron en las capturas

1. **«mar 24» es ambiguo**: en «Hoy» un vencido dice «Venció mar 24 · 08:00» (martes 24, pero se lee como «24 de marzo») — `FamiliaHoy.js:22,136`.
2. **«Hoy en tu familia» incluye vencidos de otros días** y la bandera los cuenta como «3 dosis hoy»; la tarjeta de María Elena dice «3 pendientes hoy» cuando hoy tiene 2.
3. **Dos avatares «MA» iguales** en los filtros del Calendario (María Elena y Mónica) y **tres patitas idénticas** para las mascotas: el filtro por sujeto no se puede usar sin pasar el mouse.
4. **Eventos ilegibles en la grilla de mes** desktop: «↻08:…», «↻07:…» sin título.
5. **«Grupo familiar · 2 integrantes»** en Cuenta contra **«5 integrantes»** en Familia: la misma palabra para cuentas y para personas.
6. **«Neumococo (vnc20)»**: el detalle pasa a minúsculas lo guardado como «VNC20».
7. **Calendario mobile**: ~520 px de controles (título, flechas, vistas, «…», «+ Agregar», 3 filas de filtros) antes del primer evento.
8. **Calendario vacío** muestra «No hay recordatorios en este período.» en una caja suelta, sin `EmptyState`.
9. **Familia vacía** muestra «0 dosis hoy · 0 turnos esta semana · 0 fichas incompletas»: tres chips que no dicen nada.
10. **«+ Agregar» del Calendario abre directo el formulario** y el de Familia abre un menú: el mismo botón hace dos cosas.
11. **AddReminder arranca con «Control» elegido** y sin persona: es fácil guardar una medicación como control.
12. **La API rechaza recordatorios en el pasado**: no se puede registrar «ya se la di ayer» (afecta a la adherencia del journey 2).

## 9. Qué sigue

Fase 1 — usuarios y journeys, con `design:user-research` + `design:research-synthesis` (journey mapping a mano). Los conteos de
§5 son la línea de base. Los hallazgos de §8 entran a la tabla de la Fase 2 con ID y severidad.
