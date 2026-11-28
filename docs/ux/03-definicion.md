# 03 · Definición (Fase 3)

> Entrada: `01-usuarios-y-journeys.md` y `02-auditoria.md`. Los IDs entre corchetes ([DOS-01]) dicen qué hallazgo resuelve cada decisión.
> Fecha: 27/11/2026 · Wireframes de baja fidelidad en ASCII: estructura y jerarquía, no estética (eso es la Fase 4).

## 0. Principios que salen de la auditoría

1. **Lo de hoy primero, lo crítico siempre a mano.** Cada pantalla responde en 3 segundos a «¿qué tengo que hacer ahora?». La ficha
   de emergencia está a **2 toques desde cualquier pantalla**.
2. **Nada que tenga que ver con una dosis es irreversible ni ambiguo.** Toda marca se puede deshacer, dice quién y cuándo, y distingue
   «se dio» de «no se dio» [DOS-01, DOS-02, DOS-03].
3. **Una acción, un lugar, un nombre.** «+ Agregar» se comporta igual en toda la app; invitar está en un solo lugar [CAL-06, FAM-08].
4. **Una protagonista por pantalla.** Familia → «Hoy» · Calendario → la grilla · Cuenta → la ficha propia. El resto acompaña.
5. **Leer no es editar.** Las pantallas de consulta (ficha, detalle) muestran; editar es un modo aparte [EME-04].
6. **Honestidad con los datos.** No se muestra «0» mientras carga ni se inventa lo que el backend no tiene; lo que falta va como
   `TODO(backend)` y en la interfaz queda deshabilitado o se omite, **nunca simulado** [SIS-02].

## 1. Arquitectura de información

### 1.1 Mapa

```
DOMUS+
├─ Familia  (inicio)                         ← protagonista: Hoy
│   ├─ Integrante › Detalle (Vacunas · Tratamientos · Historial · Profesionales)
│   │                 └─ Ficha de emergencia (lectura) › Editar ficha
│   └─ Mascota   › Detalle (mismo esquema)   └─ Ficha (veterinario, alergias, medicación)
├─ Calendario                                ← protagonista: la grilla
│   └─ Día › Evento › Editar evento
├─ Emergencia  (NUEVO, acceso fijo)          ← selector de persona › Ficha
└─ Cuenta                                    ← protagonista: mi ficha
    ├─ Mi perfil · Acceso y seguridad
    ├─ Grupo: personas con acceso, roles, invitar, perfiles sin cuenta
    ├─ Preferencias (este dispositivo)
    └─ Zona de peligro
Global: «+ Agregar» (menú) · Menú de usuario (cambiar ícono, ayuda, cerrar sesión) · Toasts con Deshacer · Banner «Sin conexión»
```

### 1.2 Navegación

| | Mobile (< 900 px) | Desktop (≥ 900 px) |
|---|---|---|
| Destinos | Barra inferior de **4**: Familia · Calendario · **Emergencia** · Cuenta | Barra lateral: «+ Agregar» arriba · Familia · Calendario · Cuenta · separador · **Emergencia** |
| «+ Agregar» | Botón flotante (56 px) abajo a la derecha, encima de la barra, en Familia y Calendario | Botón primario arriba de la barra lateral, siempre visible |
| Menú de usuario | Avatar arriba a la derecha en Cuenta | Pie de la barra lateral (como hoy) |
| Cerrar sesión | Dentro del menú de usuario (no en el cuerpo de Cuenta) | Ídem |

**Por qué Emergencia es un destino y no un botón dentro de Familia:** la auditoría midió el botón de María Elena a 1801 px [EME-02].
Un destino fijo en la barra está en el mismo lugar siempre, se aprende una vez y funciona con la memoria muscular de quien está
nervioso. Lleva ícono de cruz + texto, en terracota, distinto del resto.

### 1.3 Vocabulario (lo fija la Fase 5; acá se usa ya)

> Reemplazado por [05-copy.md §3](05-copy.md). Cambios: «persona sin cuenta» en lugar de «perfil sin cuenta», sólo «dosis» (sin «toma») y roles «Creó el grupo · Coordina · Puede editar · Sólo mira».

| Concepto | Palabra | No usar |
|---|---|---|
| Persona o mascota que se cuida | **integrante** | miembro, perfil |
| Persona con cuenta en el grupo | **persona con acceso** | integrante, miembro |
| Integrante sin cuenta | **perfil sin cuenta** | dependiente, usuario |
| Aviso de medicación | **dosis** (la cosa) / **toma** (el acto) | recordatorio, evento |
| Aviso de médico | **turno** (con fecha) · **control** (de rutina) | cita |
| Marca de una dosis | **dada** · **no se dio** · **sin marcar** · **pendiente** | hecho/completado mezclados |
| Ficha | **ficha de emergencia** | resumen, datos médicos |

### 1.4 Menú «+ Agregar» (el mismo en toda la app) [CAL-06, FAM-08]

```
┌───────────────────────────────────┐
│ CUIDAR                            │
│  ◯ Medicación          (dosis)    │  ← primero: es el job más frecuente (J1/J3)
│  ◯ Turno o control                │
│  ◯ Vacuna                         │
│ ───────────────────────────────── │
│ LA FAMILIA                        │
│  ◯ Persona sin cuenta             │  niño, adulto mayor
│  ◯ Mascota                        │
│  ◯ Invitar a alguien              │  con cuenta propia · código
└───────────────────────────────────┘
```
- Con contexto (desde el detalle de Nélida), «Medicación» abre el formulario con Nélida ya elegida [DOS-09].
- «Invitar a alguien» es **la única** entrada para invitar. Se va el aviso «Sumá a tu familia» del sidebar después de la primera
  invitación o al cerrarlo [FAM-08].

## 2. Estados de una dosis (la regla más importante del producto)

| Estado | Cuándo | Acciones | Se muestra |
|---|---|---|---|
| **Pendiente** | Hoy, todavía no es la hora o pasó hace < 12 h | **Dar** (= «Hecho») · Más tarde | Hora + persona |
| **Sin marcar** | Pasaron ≥ 12 h, o es de un día anterior | **Se dio…** (pide la hora, por defecto la programada) · **No se dio** | «Martes 24/11 · 08:00 · hace 3 días» |
| **Dada** | Se marcó | **Deshacer** (8 s en el toast; después, desde el evento) | «Dada 08:12 · Héctor» `TODO(backend)` |
| **No se dio** | Se marcó «No se dio» | Deshacer | Tachada, gris, ✕ en la grilla |
| **Futura** | Mañana en adelante | Editar · Posponer (desde Calendario) | Sin «Dar» (ya es así) |

**Reglas de «Más tarde»** [DOS-01]: +1 h por defecto, opciones 30 min / 1 h / 2 h; **nunca después de las 23:59 del mismo día ni a menos
de 2 h de la dosis siguiente de la serie**. Si no hay margen, el botón no aparece y se ofrece «No se dio». El toast dice la hora nueva.

**Backend (decisión D5: se hace en la Fase 6):** columna `estado` (`pendiente` · `hecho` · `omitido`), `hecho_a`, `hecho_por` y un
endpoint para volver a pendiente, con una migración Prisma. `activo` se mantiene sincronizado (`activo = estado == 'pendiente'`)
para no romper lo que ya lo lee.
- En el front todo pasa por una capa `src/data/dosis.js` (`darDosis`, `deshacerDosis`, `marcarNoSeDio`), así las pantallas no
  conocen los endpoints.
- Las entradas nuevas van a la tabla `RUTAS` del registro de actividad (regla del `CLAUDE.md`).

## 3. Familia

### 3.1 Jerarquía (test de 3 segundos: «¿qué falta hoy?»)

1. **Hoy** (protagonista): checklist de lo de hoy y, aparte, «Quedó sin marcar».
2. **Alertas** (una franja, máximo 3, sólo si hay): vacuna próxima, ficha incompleta, sin conexión.
3. **Integrantes y mascotas**: mismas tarjetas para los dos, con la próxima cosa de cada uno y «Ficha».
4. **Semana**: tira de 7 días (debajo de «Hoy» en mobile, columna derecha en desktop).
5. **Cabecera compacta**: nombre de la familia + 3 stats que se pueden tocar. Se achica: hoy ocupa 240 px de alto en desktop.

### 3.2 Stats de la cabecera

| Stat | Cuenta | Al tocar | Sin datos |
|---|---|---|---|
| «2 dosis hoy» | Sólo pendientes de **hoy** [DOS-06] | Baja a «Hoy» | Oculto |
| «4 turnos esta semana» | Turnos y controles en 7 días | Calendario › Semana | Oculto |
| «3 fichas incompletas» | Integrantes con la ficha < 100 % | Filtra las tarjetas | Oculto |

Familia vacía: ningún stat [FAM-02]. La cabecera dice «Familia Ferreyra» y el estado vacío hace el resto.

### 3.3 Wireframe · desktop 1440

```
┌──────────────┬───────────────────────────────────────────────────────────────────────────────────────┐
│ ♥ DOMUS+     │  Familia Argento                                          [rec. casa/plantas, chico]  │
│ Fam. Argento │  5 integrantes · 3 mascotas   ( 2 dosis hoy ) ( 4 turnos esta semana ) ( 3 fichas…)  │
│              │ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ borde cortado ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ │
│[+ Agregar ▾] │  ⚠ María Elena: la antigripal vence en 12 días     ⓘ Nélida: ficha al 0 % · Completar ›  │
│              │                                                                                       │
│ ◉ Familia    │ ┌─ HOY · viernes 27 de noviembre ─────────────────────┐ ┌─ ESTA SEMANA ─────────────┐ │
│ ○ Calendario │ │                                                      │ │ HOY SÁB DOM LUN MAR MIÉ JUE│ │
│ ○ Cuenta     │ │ ● 08:00  Losartán 50 mg       [MA] María Elena       │ │ 27  28  29  30  1   2   3  │ │
│              │ │          ✓ Dada 08:12 · Mónica              Deshacer │ │ ●●  ●●  ●   ●●  ●●  ●●● ●● │ │
│ ──────────── │ │ ● 07:00  Levotiroxina 50 mcg  [MO] Mónica            │ │                    Ver ›   │ │
│ ✚ Emergencia │ │          ✓ Dada 07:05                       Deshacer │ └────────────────────────────┘ │
│              │ │ ○ 23:30  Gotas para los ojos  [MA] María Elena       │ ┌─ PRÓXIMO ─────────────────┐ │
│              │ │          pendiente        [ Dar ✓ ]  [ Más tarde ▾ ] │ │ Mañana 10:00 Odontóloga   │ │
│              │ │ ──────────────────────────────────────────────────── │ │ [PA] Paola                │ │
│              │ │ QUEDÓ SIN MARCAR (1)                                 │ │ Lun 30 18:00 Desparasitar │ │
│              │ │ ! mar 24/11 · 08:00 · hace 3 días                    │ │ [🐾] Dardo                 │ │
│              │ │   Losartán 50 mg · María Elena  [Se dio…] [No se dio]│ └────────────────────────────┘ │
│              │ └──────────────────────────────────────────────────────┘                                │
│              │                                                                                       │
│              │  INTEGRANTES (5)                                                   ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐    │
│              │ ┌──────────────────┐┌──────────────────┐┌──────────────────┐      ┆ + Persona     ┆    │
│ ──────────── │ │[AA] Alfio · 9    ││[JA] José · 44    ││[ME] María Elena79│      ┆   sin cuenta  ┆    │
│ [MA] Mónica ▴│ │ O- · Maní, abeja ││ O+ · Polen       ││ A+ · Penicilina  │      └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘    │
│      Dueña   │ │ ◷ Amoxicilina 20h││ ▱▱▱▱▱ ficha 67 % ││ ◷ Gotas 23:30    │                          │
│              │ │ [Ficha ›]        ││ [Completar ficha]││ [Ficha ›]        │   (+ Mónica, Paola…)     │
│              │ └──────────────────┘└──────────────────┘└──────────────────┘                          │
│              │  MASCOTAS (3)   — mismas tarjetas: especie · vacunas al día · próximo · [Ficha ›] — + Mascota│
└──────────────┴───────────────────────────────────────────────────────────────────────────────────────┘
```

- «Hoy» ocupa la columna ancha (≈ 60 %); la semana y «Próximo» la angosta: ritmo de ancha y angosta, no dos columnas iguales.
- Tarjetas de integrante en grilla de 3 (≥ 1280) o 2: **un solo acento** (avatar + chips), sin barra lateral ni hoja [FAM-05].
- Mismo tratamiento para mascotas: avatar, especie y edad, estado de vacunas, próximo evento, «Ficha».
- La acción de la tarjeta es **«Ficha ›»**; si la ficha está incompleta, **«Completar ficha»** [EME-08].
- `EmptySlot` (el único punteado): «+ Persona sin cuenta», «+ Mascota».

### 3.4 Wireframe · mobile 390

```
┌──────────────────────────────────────┐
│ Familia Argento            [casita]  │  cabecera compacta: ~120 px
│ (2 dosis hoy)(4 turnos)(3 fichas)  → │  chips con scroll horizontal
│~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~│
│ ⚠ Antigripal de M. Elena en 12 días ›│  1 alerta visible + «2 más»
│┌ HOY · vie 27 ──────────────────────┐│
││● 08:00 Losartán 50 mg              ││
││  María Elena · ✓ Dada 08:12  Deshac││
││○ 23:30 Gotas para los ojos         ││
││  María Elena                       ││
││  [   Dar ✓   ] [ Más tarde ▾ ]     ││  botones de 48 px a lo ancho
││────────────────────────────────────││
││QUEDÓ SIN MARCAR (1)                ││
││! mar 24/11 08:00 · hace 3 días     ││
││  Losartán · María Elena            ││
││  [ Se dio… ]  [ No se dio ]        ││
│└────────────────────────────────────┘│
│ ESTA SEMANA                    Ver › │
│ [HOY][SÁB][DOM][LUN][MAR][MIÉ][JUE]  │  7 × 44 px + 6 × 4 = 332 px ✓ [FAM-04]
│ [27 ][28 ][29 ][30 ][ 1 ][ 2 ][ 3 ]  │
│ INTEGRANTES (5)                      │
│┌────────────────────────────────────┐│
││[AA] Alfio · 9 años      O- · Maní  ││  tarjeta compacta: 1 fila de datos
││◷ Amoxicilina · mar 1 20:00 [Ficha›]││
│└────────────────────────────────────┘│
│ … (José, María Elena, Mónica, Paola) │
│┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐│
│┆        + Persona sin cuenta        ┆│
│└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘│
│ MASCOTAS (3) … + Mascota             │
│                                 (＋) │  botón flotante «+ Agregar»
├──────────────────────────────────────┤
│ Familia  Calendario  ✚Emergencia  Cuenta│
└──────────────────────────────────────┘
```

### 3.5 Estados de Familia

| Estado | Qué se ve |
|---|---|
| Cargando | Skeleton de cabecera, de «Hoy» (3 filas) y de 3 tarjetas. Stats como «…», nunca «0» |
| Sin conexión | Banner fijo «Sin conexión: ves lo último que se cargó (hoy 22:40)». Botones de escritura deshabilitados con el motivo [EME-01] |
| Error del servidor | `ErrorBanner` con «Reintentar» en la sección que falló, no en toda la pantalla |
| Vacía (sin integrantes) | Cabecera sin stats · `EmptyState` «Armemos tu familia» con dos acciones: **«Sumarme yo»** (crea mi integrante con los datos de la cuenta) y «Agregar a alguien» [FAM-01] |
| Sin nada hoy | «Hoy no hay nada pendiente» + qué es lo próximo («Mañana 10:00 · Odontóloga») |

## 4. Calendario

### 4.1 Jerarquía (test de 3 segundos: «¿cómo viene el mes y qué falta?»)

1. **La grilla** (protagonista), con la adherencia por día.
2. **Panel del día elegido** (derecha en desktop, debajo en mobile): eventos con las mismas acciones que «Hoy».
3. **Pendientes sin marcar** + **resumen del mes** (adherencia %, turnos, vacunas).
4. Controles en **una sola barra**: mes ‹ › Hoy · Mes/Semana/Lista · Filtrar (n) [CAL-04].

### 4.2 Celda del mes [CAL-02, CAL-03]

```
┌───────────────┐   número: color, no opacidad (pasados textBody · otros meses textMutedLight)
│ 24        ✓✓✕ │   adherencia: ✓ dada · ✕ no se dio · ! sin marcar · ● pendiente (máx. 3 + «+2»)
│ ● ● ●     ↻   │   puntos de color por tipo (medicación · turno · vacuna) + ↻ si hay serie
│               │   desktop ≥ 1280: además 1 línea «08:00 Losartán» si entra completa; si no, nada
└───────────────┘   hover en celda vacía: «+» que abre «+ Agregar» con la fecha cargada
```

- Días de otros meses: número en `textMutedLight` (4.96:1), sin eventos.
- Hoy: número en círculo terracota (ya existe).
- Las celdas tienen `aria-label` completo: «martes 24, 2 dadas, 1 sin marcar».

### 4.3 Filtros [CAL-01]

- «Filtrar» abre un panel (popover en desktop, hoja inferior en mobile) con dos grupos:
  - **Quién:** chips con avatar **y nombre** («María Elena», «Mónica», «Fatiga»…), selección múltiple.
  - **Tipo:** Medicación · Turno o control · Vacuna (con su punto de color = leyenda).
- El botón muestra cuántos filtros hay activos: «Filtrar (2)». Chips activos debajo de la barra con ✕ para quitarlos.

### 4.4 Wireframe · desktop 1440

```
┌──────────────┬───────────────────────────────────────────────────────────────────────────────────────┐
│ ♥ DOMUS+     │ Noviembre 2026   [‹][›][Hoy]   (Mes|Semana|Lista)  [Filtrar (0)]  [⋯]                │
│[+ Agregar ▾] │ ┌─ L ── M ── X ── J ── V ── S ── D ──────────────────────┐ ┌─ VIERNES 27 · HOY ────────┐ │
│              │ │ 26   27   28   29   30   31   1   (atenuados, color)   │ │ ● 07:00 Levotiroxina      │ │
│ ○ Familia    │ │ 2    3    4    5    6    7    8                        │ │   Mónica · ✓ Dada 07:05   │ │
│ ◉ Calendario │ │ …                                                      │ │ ! 08:00 Losartán 50 mg    │ │
│ ○ Cuenta     │ │ 23✓✓ 24✓✕ 25✓✓ 26✓✓ ⦿27✓! 28●● 29●●                    │ │   María Elena · sin marcar│ │
│              │ │  ●●   ●●   ●●   ●●   ●●●  ●●   ●●    ↻                 │ │   [Se dio…] [No se dio]   │ │
│ ──────────── │ │ 30●● 1●●  2●●  3●●  4 ●● 5●●  6●●                      │ │ ○ 23:30 Gotas p/ los ojos │ │
│ ✚ Emergencia │ └────────────────────────────────────────────────────────┘ │   [Dar ✓] [Más tarde ▾]   │ │
│              │  ● Medicación  ● Turno o control  ● Vacuna   ✓ dada ✕ no se │ └───────────────────────────┘ │
│              │  dio  ! sin marcar  ↻ se repite              (leyenda única)│ ┌─ SIN MARCAR (2) ─────────┐ │
│              │                                                             │ │ mar 24 · Losartán   Ver › │ │
│              │                                                             │ └───────────────────────────┘ │
│              │                                                             │ ┌─ NOVIEMBRE ───────────────┐ │
│              │                                                             │ │ 92 % dosis dadas (46/50)  │ │
│              │                                                             │ │ 3 turnos · 1 vacuna       │ │
│              │                                                             │ └───────────────────────────┘ │
└──────────────┴───────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Wireframe · mobile 390

```
┌──────────────────────────────────────┐
│ Noviembre 2026      [‹][›] [Hoy]     │  una barra: ~56 px
│ (Mes|Semana|Lista)    [Filtrar (2)]  │  44 px de alto [CAL-05]
│ ✕ María Elena  ✕ Medicación          │  sólo si hay filtros activos
│ L   M   X   J   V   S   D            │
│ 23  24  25  26 (27) 28  29           │  celdas ~50 px: número + 1 fila de puntos
│ ✓   ✕   ✓   ✓   !   ●   ●            │  adherencia en un solo símbolo (el peor del día)
│ 30  1   2   3   4   5   6            │
│ ●   ●   ●   ●   ●   ●   ●            │
│ ────────────────────────────────     │
│ VIERNES 27 · HOY                     │  panel del día debajo
│ ! 08:00 Losartán 50 mg               │
│   María Elena · sin marcar           │
│   [ Se dio… ] [ No se dio ]          │
│ ○ 23:30 Gotas para los ojos          │
│   [   Dar ✓   ] [ Más tarde ▾ ]      │
│ ────────────────────────────────     │
│ NOVIEMBRE: 92 % dadas · 3 turnos     │
│                                 (＋) │
├──────────────────────────────────────┤
│ Familia  Calendario  ✚Emergencia  Cuenta│
└──────────────────────────────────────┘
```
Primer evento a ≈ 430 px en lugar de ≈ 900 px [CAL-04].

### 4.6 Estados de Calendario

| Estado | Qué se ve |
|---|---|
| Cargando | Grilla con números y skeleton en lugar de puntos; resumen «…» — **nunca «0 turnos»** [SIS-02] |
| Mes sin eventos | `EmptyState` chico en el panel: «Noviembre está libre» + «Programar algo» [CAL-07] |
| Filtro sin resultados | «No hay nada de María Elena en noviembre» + «Quitar filtros» |
| Sin conexión | Banner global; acciones de marcar deshabilitadas con el motivo |

## 5. Emergencia (destino nuevo)

### 5.1 Selector → ficha

```
mobile                                         desktop (barra lateral › Emergencia)
┌──────────────────────────────────────┐      ┌──────────────────────────────────────────────────────┐
│ ✚ Emergencia                         │      │ ✚ Emergencia — ¿de quién?                           │
│ ¿De quién es la ficha?               │      │ [ (AA)  ][ (JA)  ][ (ME)  ][ (MO)  ][ (PA)  ][ 🐾 ]… │
│ ┌────────┐┌────────┐┌────────┐       │      │  Alfio   José    María E. Mónica  Paola   Fatiga    │
│ │ (ME)   ││ (AA)   ││ (MO)   │       │      │  (caras de 96 px; las incompletas con «faltan datos»)│
│ │María E.││ Alfio  ││ Mónica │       │      └──────────────────────────────────────────────────────┘
│ │ 79 años││ 9 años ││41 años │       │      Si hay una sola persona, salta directo a su ficha.
│ └────────┘└────────┘└────────┘       │      Orden: mayores y menores primero (los que más la necesitan),
│ ┌────────┐┌────────┐ ┌──────┐        │      después adultos, después mascotas.
│ │ (JA)   ││ (PA)   │ │🐾 Mas│        │
│ └────────┘└────────┘ └──────┘        │
│ [   Llamar al 107 (SAME)   ]         │  número de emergencias siempre visible
└──────────────────────────────────────┘
```

### 5.2 Ficha en modo lectura [EME-03, EME-04, EME-05]

```
┌──────────────────────────────────────┐
│ ‹ Emergencia                [Copiar] │
│ (foto) María Elena Argento           │
│        79 años · Marcapasos          │  edad + condición crítica junto al nombre
│ ┌──────────┐ ┌─────────────────────┐ │
│ │ SANGRE   │ │ ALERGIAS            │ │
│ │   A+     │ │ Penicilina · AINEs  │ │
│ └──────────┘ └─────────────────────┘ │
│ TOMA ACTUALMENTE                     │  de los tratamientos activos (los datos ya existen)
│ · Losartán 50 mg — 1 por la mañana   │
│ · Gotas para glaucoma — noche        │
│ NOTAS                                │
│ Usa audífono en el oído izquierdo.   │
│ LLAMAR                               │
│ (📞) Mónica Argento · hija           │  un solo botón por fila: toda la fila llama
│      +54 9 11 5555-1201              │  número sin cortes, tabular-nums
│ (📞) SAME · 107                      │
│ ──────────────────────────────────── │
│ [ Editar ficha ]   actualizada hace… │  editar = otra pantalla; «actualizada» TODO(backend)
└──────────────────────────────────────┘
```
- **Un solo acento** (sin borde superior) [EME-06]. Títulos de sección en serif chico, no versalitas grises.
- Mascota: especie, raza, peso (si se carga), alergias, medicación, **veterinario** (de Profesionales con especialidad «Veterinario»).
- Sin conexión: se muestra la última copia guardada en el dispositivo con «Guardada el 27/11 22:40» [EME-01].
- QR / link de sólo lectura: **no se hace** (D1), queda `TODO(backend)`.

**Línea de base → objetivo:** 1 toque + ≈ 2 scrolls + 1 toque (6–12 s, sin garantía) → **2 toques desde cualquier pantalla**
(Emergencia → cara), sin scroll.

## 6. Cuenta

### 6.1 Jerarquía (test de 3 segundos: «¿está todo en orden con mi cuenta y mi familia?»)

1. **Mi ficha de emergencia** (protagonista): % de completitud, qué falta y «Ver como en una emergencia». Sin QR (D1).
2. **Grupo:** personas con acceso y su rol, perfiles sin cuenta, invitar.
3. **Mi perfil** y **Acceso y seguridad** (contraseña, sesiones, 2FA).
4. **Preferencias** (este dispositivo).
5. **Zona de peligro** (al final, separada).

### 6.2 Roles del grupo

El prompt pide Dueño, Admin, Miembro y Cuidador. **«Admin» choca con el admin del sistema** (`Usuario.rol = admin`, que ve el
registro de actividad y no tiene familia; `CLAUDE.md`, «Dos niveles de rol»). En la interfaz se propone **«Coordina»**.

| Puede… | Dueño | Coordina (Admin) | Miembro | Cuidador |
|---|---|---|---|---|
| Ver todo (fichas, calendario, historial) | ✓ | ✓ | ✓ | ✓ |
| Marcar dosis (dar / no se dio) | ✓ | ✓ | ✓ | ✓ |
| Cargar y editar integrantes, recordatorios, vacunas | ✓ | ✓ | ✓ | — |
| Borrar integrantes y registros | ✓ | ✓ | — | — |
| Invitar y cambiar roles | ✓ | ✓ (menos al dueño) | — | — |
| Renombrar y eliminar el grupo | ✓ | — | — | — |

Hoy existen sólo `dueno` y `miembro` (= Coordina en permisos, sin poder invitar). **Todo lo nuevo es `TODO(backend)`**. Mientras
tanto, la interfaz muestra los roles reales y el selector de rol al invitar aparece deshabilitado con «Próximamente».

### 6.3 Preferencias

| Preferencia | Dónde vive | Estado |
|---|---|---|
| Tamaño de texto (Normal · Grande · Muy grande) | Dispositivo | Existe |
| **Contraste alto** (tinta más oscura, bordes de 2 px, sin grano ni hojas decorativas) | Dispositivo | Nuevo, se puede hacer en el front |
| Tema oscuro | — | **No se hace** (D2): deuda del handoff |
| **Aviso anticipado**: «Avisarme» al momento · 15 min antes · 1 h antes · el día anterior | Dispositivo (notificaciones locales) | Hoy es un interruptor; se amplía en el front |
| **Horario silencioso** (desde – hasta, salvo medicación) | Dispositivo | Nuevo, se puede hacer en el front |
| Canales (push / email), preferencias en la cuenta | Cuenta | `TODO(backend)` |

### 6.4 Sesiones y 2FA

No existen en el backend. **No se simulan**: una pantalla de seguridad falsa en una app de salud enseña algo que no es cierto.
Se muestran como filas deshabilitadas: «Dispositivos con la sesión abierta · Próximamente» y «Verificación en dos pasos ·
Próximamente», con `TODO(backend)`.

### 6.5 Wireframe · desktop 1440

```
┌──────────────┬───────────────────────────────────────────────────────────────────────────────────────┐
│ ♥ DOMUS+     │ Mi cuenta                                                                             │
│[+ Agregar ▾] │ ┌─ MI FICHA DE EMERGENCIA ───────────────────────────────┐ ┌─ GRUPO · Familia Argento ┐ │
│              │ │ (MA) Mónica Argento · 41 años                          │ │ 2 personas con acceso    │ │
│ ○ Familia    │ │ ▰▰▰▱▱▱▱▱ 25 %                                          │ │ (MA) Mónica  Dueña       │ │
│ ○ Calendario │ │ Te falta: alergias · notas · un contacto               │ │ (JA) José    Miembro ▾ 🗑 │ │
│ ◉ Cuenta     │ │ [ Completar mi ficha ]          [ Ver como en una      │ │ 3 perfiles sin cuenta    │ │
│              │ │                                   emergencia › ]       │ │ Alfio · M. Elena · Paola │ │
│ ──────────── │ └────────────────────────────────── hoja de color asoma ─┘ │ [ Invitar a alguien ]    │ │
│ ✚ Emergencia │ ┌─ MI PERFIL ─────────────────┐ ┌─ ACCESO Y SEGURIDAD ───┐ │ [Renombrar grupo]        │ │
│              │ │ Mónica Argento              │ │ Cambiar contraseña   › │ └──────────────────────────┘ │
│              │ │ monica@domus.test   Editar  │ │ Sesiones   Próximamente│ ┌─ PRIVACIDAD ─────────────┐ │
│              │ │ Ícono (MA)        Cambiar   │ │ 2 pasos    Próximamente│ │ Sólo tu familia ve esto. │ │
│              │ └─────────────────────────────┘ └────────────────────────┘ │ Descargar mis datos  ›   │ │
│              │ ┌─ PREFERENCIAS · en este dispositivo ──────────────────────────────────────────────┐ │
│              │ │ Tamaño de texto (Normal|Grande|Muy grande)   Contraste alto  [○ ]                   │ │
│              │ │ Avisarme (Al momento|15 min|1 h|Día anterior) Horario silencioso [○ ] 22:00 – 07:00 │ │
│              │ └───────────────────────────────────────────────────────────────────────────────────┘ │
│              │ ┌─ ZONA DE PELIGRO ─────────────────────────────────────────────────────────────────┐ │
│ [MA] Mónica ▴│ │ Salir del grupo · Eliminar mi cuenta  (confirmación escribiendo el nombre)        │ │
│  (menú: ícono│ └───────────────────────────────────────────────────────────────────────────────────┘ │
│  ayuda, salir│                                                                                       │
└──────────────┴───────────────────────────────────────────────────────────────────────────────────────┘
```
- 2 columnas de 60/40: la izquierda con la ficha (protagonista) y lo personal; la derecha con el grupo. Preferencias y zona de peligro
  a lo ancho. Cierra el hueco de 215 px [CTA-03].
- Sin cinta rosa [CTA-01]. Sin punteado en acciones [CTA-04]. Eliminar a José: 44 × 44 [CTA-05].
- «Cerrar sesión» sale del cuerpo y va al menú de usuario.

### 6.6 Wireframe · mobile 390

```
┌──────────────────────────────────────┐
│ Mi cuenta                      (MA)▾ │  avatar = menú de usuario (ícono, ayuda, cerrar sesión)
│┌ MI FICHA DE EMERGENCIA ────────────┐│
││ ▰▰▰▱▱▱▱▱ 25 %                       ││
││ Te falta: alergias · notas · 1 contacto│
││ [   Completar mi ficha   ]          ││
│└────────────────────────────────────┘│
│┌ GRUPO · Familia Argento ───────────┐│
││ (MA) Mónica           Dueña        ││
││ (JA) José             Miembro   🗑  ││
││ 3 perfiles sin cuenta            › ││
││ [   Invitar a alguien   ]          ││
│└────────────────────────────────────┘│
│ MI PERFIL                          › │  filas tipo lista
│ ACCESO Y SEGURIDAD                 › │
│ PREFERENCIAS                       › │  (pantalla propia en mobile)
│ PRIVACIDAD Y DATOS                 › │
│ AYUDA                              › │
│ ZONA DE PELIGRO                    › │
├──────────────────────────────────────┤
│ Familia  Calendario  ✚Emergencia  Cuenta│
└──────────────────────────────────────┘
```

## 7. Formulario de medicación (porque resuelve 3 P1 y apoya los P0)

```
┌──────────────────────────────────────┐
│ ‹ Volver       Nueva medicación      │  título serif, según el tipo elegido en el menú
│ ¿Para quién?                         │
│ ((ME) María Elena ✓) (AA) (MO) …     │  preseleccionada si hay contexto [DOS-09]
│ Medicamento *                        │
│ [ Losartán                        ]  │  autocompleta con los tratamientos de esa persona
│ Dosis                                │
│ [ 50 mg · 1 comprimido            ]  │
│ ¿Cuándo?                             │
│ Desde [ hoy 27/11 ▾ ]                │
│ Horarios  (08:00 ✓)(14:00)(20:00)(+) │  varios horarios por día [DOS-10]
│ Repetir   (Todos los días ✓)(Cada…)  │
│ Hasta     (Sin fecha de fin)(Fecha ▾)│  en vez de «cuántas veces»
│ Notas (opcional)                     │
│ [ con el desayuno                 ]  │
│ [        Guardar medicación        ] │
└──────────────────────────────────────┘
Resumen antes de guardar (debajo del botón, en vivo):
«Losartán 50 mg para María Elena, todos los días a las 08:00, desde hoy, sin fecha de fin.»
```
`TODO(backend)`: varios horarios por día = varias series (el front las crea en paralelo, como hoy hace la repetición); «Sin fecha de
fin» = series largas de 100 repeticiones con renovación, o soporte real de serie abierta; «Medicamento + Dosis» se guardan en
`descripcion` («Losartán 50 mg · 1 comprimido») hasta tener columnas propias o el vínculo con `Tratamiento`.

## 8. Decisiones (respondidas el 27/11)

| # | Decisión | Por qué importa | Resolución |
|---|---|---|---|
| D1 | **QR de la ficha** | El prompt lo pide; `TODO_BACKEND_REDISENO.md` dice que el QR «se dejó afuera a pedido del equipo en la ronda anterior». Un QR útil necesita un link público de sólo lectura (backend + decisión de privacidad) ✅ **No se hace.** Queda un `TODO(backend)` (link público de sólo lectura). Se hace «Ver como en una emergencia» y la copia offline |
| D2 | **Tema oscuro** | Duplica la verificación de contraste de toda la paleta y de las ilustraciones ✅ **Sólo contraste alto.** El tema oscuro va a la deuda del handoff (Fase 8) |
| D3 | **Nombre del rol «Admin»** | Choca con el admin del sistema Adoptada salvo objeción: **«Coordina»** en la interfaz (no se preguntó por separado) |
| D4 | **Emergencia como 4.º destino de la barra** | Cambia la navegación de los 3 tabs que conoce el equipo ✅ **Sí:** Familia · Calendario · Emergencia · Cuenta |
| D5 | **Deshacer y «No se dio» sin backend** | Sin endpoint, no hay Deshacer real ✅ **Se toca el backend en la Fase 6:** endpoint para reactivar + columna `estado` (`pendiente`/`hecho`/`omitido`) con su migración Prisma. `hecho_a` / `hecho_por` entran en la misma migración |

## 9. Trazabilidad

| Hallazgo | Se resuelve en |
|---|---|
| DOS-01, DOS-02, DOS-03, DOS-04 | §2 Estados de una dosis |
| DOS-05, DOS-12 | Toast con tipo y duración (Fase 4, `Toast`) |
| DOS-06, DOS-07 | §3.1, §3.2, §3.3 («Hoy» + «Quedó sin marcar», fechas relativas) |
| DOS-08, DOS-09, DOS-10 | §7 |
| DOS-11 | Notificación → panel del día con el evento resaltado (§4.1) |
| EME-01 | §3.5 y §5.2 (grupo guardado, banner, copia offline) |
| EME-02 | §1.2 y §5.1 |
| EME-03 – EME-07 | §5.2 |
| EME-08, FAM-01 | §3.3, §3.5 |
| FAM-02 – FAM-08 | §3 |
| CAL-01 – CAL-07, SIS-02 | §4 |
| CTA-01 – CTA-07 | §6 |
| VIS-01 – VIS-03, CTA-04, FAM-05, EME-06 | Fase 4 (tokens y componentes) |
| FRM-01 – FRM-05 | Fase 5 (copy) y Fase 6 (pulido) |
