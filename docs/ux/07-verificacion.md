# 07 · Verificación

> Fase 7 del review UI/UX. Todo medido el 28/11/2026 sobre la rama `feature/ux-review`, con la app real (Expo web +
> backend en Docker), Edge vía Playwright, en 1440 × 900 (desktop), 834 × 1112 (tablet), 390 × 844 (mobile) y
> 720 × 450 (equivale a zoom 200 % sobre 1440 × 900). Mismos datos de demo que en la Fase 0 (Familia Argento).
> **No** es una prueba con usuarios: los tiempos son de un recorrido automatizado y los pasos se cuentan igual que en
> [01-usuarios-y-journeys.md](01-usuarios-y-journeys.md) («acciones» = toques, tipeos y selecciones).

## 1. Antes y después

Capturas completas en `capturas/despues/{desktop,tablet,mobile}/` (mismos nombres que en `capturas/antes/`).
Comparaciones lado a lado en `capturas/comparacion/`:

| Comparación | Qué cambió |
|---|---|
| `mobile-datos-familia.png` | Cabecera de papel con datos sin ceros y «Agregar»; «Hoy» con «Quedó sin marcar» separado; fechas «martes 24/11 · hace 4 días» en lugar de «mar 24» |
| `mobile-datos-emergencia-inicio-vs-datos-familia.png` | Antes, la ficha de María Elena estaba en y = 1801 (dos pantallas de scroll). Ahora: pestaña Emergencia, y = 490 |
| `mobile-datos-emergencia.png` | Edad, «Toma actualmente», «Para tener en cuenta», «A quién llamar»; sólo «Llamar» en modo lectura; teléfonos en una línea; un solo acento |
| `mobile-datos-calendario-mes.png` | «Filtrar», botones de 44 px, menú «Agregar» común |
| `mobile-datos-alta-recordatorio.png` | «Nueva dosis», «¿Qué es?» sin preelección, «Medicamento» + «Dosis» |
| `mobile-datos-familia-menu-agregar.png` | Un solo menú: Cuidar (Medicación, Turno o control, Vacuna) · La familia (Persona sin cuenta, Mascota, Invitar a alguien) |
| `mobile-datos-cuenta.png` | «2 personas con acceso», roles «Creó el grupo» / «Puede editar» |
| `desktop-datos-calendario-mes.png` | Grilla con ✓ ⊖ ✕ y cantidad en lugar de chips truncados; filtros con nombre |
| `desktop-datos-familia.png`, `desktop-datos-emergencia.png` | Ídem en escritorio |

Recorridos de esta fase en `capturas/despues/journeys/`.

## 2. Journeys: antes y después

| Journey | Antes (Fase 1) | Después (medido) | Resultado |
|---|---|---|---|
| **J-A** Onboarding hasta la familia | 10 acciones, 4 pantallas | **8 acciones** (registro 4 campos + enviar + 1 campo + crear) | −2. Error de contraseña ahora en texto: «A la contraseña le falta: 8 caracteres o más, una mayúscula y un número.» |
| J-A Primer integrante **con su ficha abierta** | 6 acciones y la ficha **no era parte del flujo** (quedaba «Ficha al 0 %») | **6 acciones** hasta la ficha: alta (3 campos + guardar) → toast «Nélida ya está en tu familia · **Completar su ficha**» → ficha | La ficha entra en el flujo sin pasos extra |
| **J-B** Medicación diaria | 1 menú + 7 decisiones, **sin campo para el remedio** (el evento se llamaba «Recordatorio») | **9 acciones**: menú (2) + medicamento + dosis + fecha + hora + minutos + «Todos los días» + guardar. Persona preelegida (una sola) | Mismo esfuerzo, ahora con el dato que importa. Toast: «Listo: Enalapril 10 mg, todos los días a las 08:00» |
| J-B Marcar la toma | 1 toque, **irreversible**; en atrasadas, «Más tarde» la pasaba al día siguiente | **1 toque** («Dada») + **Deshacer** en el toast y en la fila. Atrasadas: «¿Se la dieron?» → «A horario (08:00)» / «No sé la hora», o «No se dio» | P0 resueltos (DOS-01/02/03). Probado en la base: `estado`, `hecho_a`, `hecho_por` |
| **J-C** Ficha de emergencia | 1 toque + ≈ 2 scrolls + 1 toque; botón en y = 1801 (viewport 844) | **2 toques desde cualquier pantalla**, sin scroll (tarjeta en y = 490–612). 241 ms hasta ver «Tipo de sangre» (automatizado) | Sangre, alergias, lo que toma y notas entran en la primera pantalla (y = 287 a 601). **Sin conexión también abre** (copia local) |
| **J-D1** Invitar | 1 a 3 acciones según la entrada, con 3 nombres distintos | **3 acciones** (Agregar → Invitar a alguien → Invitar a alguien) | Un solo nombre en menú, barra lateral y Cuenta |
| **J-D2** Persona sin cuenta | 7 acciones; terminaba en «Ficha al 0 %» | 7 acciones + 1 para abrir su ficha desde el toast; la tarjeta dice «Completar ficha» | Igual de corto, con salida a la ficha |

## 3. Accesibilidad re-medida

Mismo script que en la Fase 2 (contraste por luminancia relativa sobre el fondo real, objetivos táctiles, desborde,
recorrido con Tab), sobre 7 pantallas: Familia, Calendario (mes), Emergencia (selector y ficha), Cuenta, detalle de
integrante y nueva dosis.

| Criterio | Fase 2 | Ahora |
|---|---|---|
| Objetivos < 44 px (mobile y desktop) | Segmentado 42 px, chips 40 px, celdas de la semana 36 px, «Eliminar a José» 40 × 48 | **0** (el último, «Quitar a José del grupo», pasó a 48 × 48 en esta fase) |
| Texto con contraste < AA | Días del calendario 2,71:1 y 4,40:1; iniciales ocre 4,17:1 | **0** en texto. Quedan 3 glifos de íconos decorativos que el script detecta (no son texto) |
| Foco visible (Tab, 18 pasos por pantalla) | 100 % con anillo | **100 %** con anillo. Persiste un paso que cae en `body` (SIS-03, P2) |
| Zoom 200 % (720 × 450): desborde horizontal de página | 0, con un contenedor interno de 780 px en Cuenta | **0**. Persiste el contenedor interno de Cuenta (CTA-06, P2) |
| Botón dentro de botón | — (no medido) | Encontrado en la Fase 6 en vacunas/tratamientos y corregido. 0 avisos `validateDOMNesting` |
| Estado sólo por color | Requisitos de contraseña; ✓/✕ del calendario | Requisitos con ícono + «cumple / falta» para el lector; marcas ✓ ⊖ ✕ con leyenda en palabras |

No verificado acá: lector de pantalla real (NVDA / TalkBack) y el APK en Android (las notificaciones de DOS-11 no
existen en web). Quedan en el plan de la Fase 8.

## 4. Checklist anti-vibecoded

| Regla | Estado | Evidencia |
|---|---|---|
| Sin degradados genéricos | ✅ | `grep LinearGradient|linear-gradient|radial-gradient src/` → 0 |
| Sin vidrio / blur | ✅ en pantallas · ⚠ queda en `RadialFab` | Esta fase: `SegmentedControl` pasó de `BlurView`/`backdropFilter` a papel arena plano; el fondo de los diálogos ya no se desenfoca. `RadialFab` conserva blur (sólo se importa su forma desde `BlobSpinner`). `CrossfadeIcon` usa un blur de 2 px durante 150 ms en el cambio de ícono: es transición, no superficie |
| Sin emojis como íconos | ✅ | El único emoji en `src/` está en un comentario de `MainTabs.js` |
| Sin tarjetas todas iguales | ✅ | Jerarquía: «Hoy» con hoja de color (la única), tarjetas de integrante planas, selector de Emergencia con datos, ficha sin decoración |
| Sin espaciado arbitrario | ⚠ parcial | Componentes nuevos y pantallas migradas usan `espacio[]`; las pantallas viejas (Cuenta, detalle, formularios de salud) conservan valores sueltos (VIS-02, P2) |
| Sin datos «Si» / «Test» a la vista | ✅ en la demo · ⚠ local | 0 «Lorem»/«Test» en el código. La serie «Si» sigue en el grupo 3 de la base local (SIS-04): borrar antes de la demo |
| Hover, foco y deshabilitado | ✅ | Foco 100 %; `PressScale` con hover; botones de marca con opacidad 0,55 mientras se guarda |
| Vacío, carga y error | ✅ | Hoy: «Cargando lo de hoy…», «No pudimos cargar lo de hoy» + Reintentar, «Nada pendiente para hoy». Familia, Calendario y Emergencia con `EmptyState`. Sin conexión: aviso con fecha de la copia. Nunca «0» mientras carga |
| Sombras de papel, no difusas | ✅ en pantallas principales · ⚠ entrada | Sombras corridas sin difuminar en tarjetas y segmentado. Quedan sombras difusas en `AuthLayout` (login/registro), `WelcomeScreen`, `ConfirmModal` y los tokens `glassShadow` de `colors.js` |
| La decoración no compite con datos de salud | ✅ | La ficha no tiene ilustraciones; el `PaperBanner` es la única pieza decorativa grande por pantalla; con la familia vacía no se repite la ilustración |
| Jerarquía y ritmo variado | ✅ | Título serif, datos en etiquetas, lo accionable primero (Hoy antes que la lista) |
| `tabular-nums` | ✅ | 21 usos: horas, teléfonos, números de día, datos de las tarjetas |
| Truncado con tooltip | ✅ | Próximo aviso de cada tarjeta con `title`; alergias «Penicilina, AINEs y 2 más» en vez de cortar |
| Plurales correctos | ✅ | `plural()` en 23 lugares; «1 aviso ya pasó y nadie lo marcó» / «3 avisos ya pasaron…» |
| Fechas relativas y sin ambigüedad | ✅ | «ayer 08:00», «martes 24/11 · 08:00 · hace 4 días»; ya no aparece «mar 24» |
| AA, foco, 44 px, zoom 200 % | ✅ | §3 |

## 5. Encontrado y corregido durante esta fase

| Qué | Commit |
|---|---|
| Con la familia vacía, «Hoy» («Nada pendiente para hoy») aparecía antes que «Empecemos por tu familia» y la ilustración se repetía | `7573a06` |
| **La pestaña Emergencia recordaba la última ficha abierta**: en desktop, volver a Emergencia mostraba la ficha anterior (en un apuro, la de otra persona). Ahora siempre abre «¿De quién es la ficha?» | `ec890d9` |
| Iniciales del avatar ocre a 4,17:1 → 5,59:1; «Quitar a José del grupo» de 40 a 48 px | `4abe114` |
| `SegmentedControl` con vidrio y fondo de diálogo con blur | `4f18d0c` |

## 6. Lo que sigue sin resolver

| Qué | Severidad | Dónde sigue |
|---|---|---|
| Contraste alto (D2): paleta lista, falta el interruptor | Decisión D2 | Fase 8 |
| FAM-01 dueño como integrante · CTA-07 rol «Sólo mira» · FRM-05 cargar una dosis pasada | P1 / P2 | `TODO(backend)` |
| Sombras difusas en login, registro, bienvenida y modal de confirmación | P2 | Fase 8 |
| VIS-01 títulos serif en todas las pantallas · VIS-02 espaciado en pantallas viejas · CTA-01/03/04/06 · SIS-03 · EME-07 · FAM-03 · DOS-10 | P2 | Fase 8 |
| SIS-04 serie «Si» en la base local | Dato | Antes de la demo |
| Probar en Android (notificación → día) y con lector de pantalla | — | Fase 8 |
