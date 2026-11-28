# 08 · Handoff

> Cierre del review UI/UX de DOMUS+ (fases 0 a 8). Para quien siga el trabajo: qué cambió, cómo usarlo, qué falta y
> cómo probarlo antes de la demo. Los detalles están en los documentos de cada fase:
>
> [00 inventario](00-inventario.md) · [01 usuarios y journeys](01-usuarios-y-journeys.md) · [02 auditoría](02-auditoria.md) ·
> [03 definición](03-definicion.md) · [04 sistema visual](04-design-system.md) · [05 copy](05-copy.md) ·
> [06 implementación](06-implementacion.md) · [07 verificación](07-verificacion.md)

## 1. En una página

- **Rama:** `feature/ux-review`, 21 commits sobre `feature/familia-hoy` (que a su vez tiene 8 commits que todavía no
  están en `main`). Nada pusheado.
- **Resuelto:** los 4 P0 (marca de dosis irreversible o falsa, «Más tarde» que pasaba la dosis al día siguiente, la app
  que «olvidaba» la familia sin conexión), todos los P1 salvo FAM-01, y parte de los P2.
- **Producto:** 4.º destino **Emergencia** (ficha a 2 toques, también sin red); marca de dosis **dada / no se dio** con
  **Deshacer**; un solo menú **Agregar**; formulario de medicación con **medicamento y dosis**.
- **Backend:** una migración (`20261128090000_estado_de_recordatorio`) y dos endpoints (`marcar`, `reactivar`).
- **Sistema:** `theme/tokens.js` + 10 componentes + `/styleguide`. Las pantallas viejas siguen con `theme/colors.js`
  y se migran de a una.

## 2. Para mergear

1. Mergear primero `feature/familia-hoy` a `main` por PR (o rebasear `feature/ux-review` sobre `main` y mergear una sola).
2. ⚠️ El merge a `main` **publica una OTA** (toca `frontend/**`). Antes, correr la QA de la §6 en web **y** en el APK.
3. La migración se aplica sola al levantar el backend (`Dockerfile.dev` corre `migrate deploy`). En producción
   (Render + Supabase) correr `npx prisma migrate deploy`. Es aditiva: no borra columnas; los recordatorios ya
   desactivados quedan como `hecho` sin hora ni autor.
4. Compatibilidad: el APK viejo sigue funcionando contra el backend nuevo (`PATCH /desactivar` se mantiene y ahora
   también guarda `estado: hecho`). El APK nuevo necesita el backend nuevo (`/marcar`, `/reactivar`).

## 3. Qué cambió, por pantalla

| Pantalla | Cambios | Hallazgos |
|---|---|---|
| **Familia** | `PaperBanner` con datos sin ceros y `AddMenu`. «Hoy» separa *Quedó sin marcar* (pregunta «¿Se la dieron?») de *Hoy* («Dada», «Pasar a las …»); lo marcado hoy queda con «Deshacer». Tarjetas con edad y «Completar ficha». Semana de 48 px. Familia vacía: sólo el estado vacío | DOS-01..07, FAM-02/04/05/07/08, EME-08 |
| **Calendario** | Misma marca que Hoy (sin diálogo). Grilla con ✓ ⊖ ✕. Filtros con nombre; «Filtrar» en el celular; 44 px; «Dosis dadas 12 de 14» en vez de «Adherencia»; sin «0» mientras carga | DOS-04, CAL-01..07, SIS-02 |
| **Emergencia (nueva)** | «¿De quién es la ficha?» con sangre y alergias en cada tarjeta. Tocar la pestaña siempre vuelve acá | EME-02 |
| **Ficha** | Modo lectura (sólo «Llamar»); «Editar ficha» muestra lápiz y tacho. Edad, «Toma actualmente» (tratamientos vigentes), «Para tener en cuenta», «A quién llamar». Sin conexión: copia local + aviso con fecha | EME-01, 03..06 |
| **Nueva dosis / turno / vacuna** | Título según el tipo; tipo sin preelegir; persona preelegida si hay una; «Medicamento» + «Dosis»; errores que dicen qué falta; sin interruptor «activo» | DOS-08/09 |
| **Alta de persona** | Toast «Nélida ya está en tu familia · Completar su ficha» | EME-08 |
| **Cuenta** | «Personas con acceso», roles «Creó el grupo» / «Puede editar», «Invitar a alguien», textos de salir/quitar/eliminar | CTA-02/05, COP-05 |
| **Registro** | Requisitos de contraseña legibles por el lector y error que nombra lo que falta | FRM-01 |
| **Detalle** | Filas sin botón dentro de botón; siglas como se cargaron | FRM-03 |
| **Global** | Toasts de error persistentes; textos del backend; notificación → día del aviso; segmentado y diálogos sin blur | DOS-05/11, COP-04 |

## 4. Para desarrollar

### Tokens y componentes

Ver [04-design-system.md](04-design-system.md) y `http://localhost:8081/styleguide` (estados, contraste en vivo,
teclado). Lo mínimo:

| Para | Usar | No usar |
|---|---|---|
| Colores, texto, espacios, radios | `import { color, texto, espacio, radio, tactil } from '../theme/tokens'` | Hex sueltos, `fontSize` sueltos |
| Tipo de evento (medicación/turno/vacuna) | `tipoEvento[tipo]` → `{ marca, fondo, texto, icono }` | `TIPO_AVISO` (viejo, se va) |
| Estado de una dosis | `estadoDosis[estado]` + `estadoParaMostrar(r)` de `data/dosis.js` | `!r.activo` |
| Cabecera de pantalla | `PaperBanner` (una por pantalla) | Recortes / bandas propias |
| Datos con número | `StatChip` con `ocultarSiCero` | «0 dosis hoy» |
| Un evento en una lista | `EventItem` con las acciones como `children` | Barras laterales de color |
| Agregar algo | `AddMenu` | Botones «+ Agregar» propios |
| Lugar vacío para completar | `EmptySlot` (único uso del borde punteado) | Bordes punteados en acciones |
| Avisos | `mostrarToast(texto, 'error')` / `{ accion: { etiqueta: 'Deshacer', onPress } }` | Toast de éxito para errores |

### API nueva

```
PATCH /api/recordatorios/:id/marcar     { estado: 'hecho' | 'omitido', hecho_a?: ISO }   → { id, estado, hecho_a }
PATCH /api/recordatorios/:id/reactivar                                                → { id, estado: 'pendiente' }
GET   /api/recordatorios   ahora incluye  estado, hecho_a, marcado_por: { id, nombre }
```

- `hecho_a` = cuándo pasó (no cuándo se tocó). No puede ser futura (margen de 5 min) ni de más de un día antes de lo programado.
- Ambos filtran por grupo (404 si el recordatorio es de otra familia; probado) y están en `RUTAS` de `utils/actividad.js`
  (sólo se registra acción, entidad e id, nunca el estado ni la hora).
- Eliminar un integrante o mascota ahora borra también sus recordatorios (COP-01).

### Reglas que conviene no romper

- **Dosis:** nunca ofrecer «pasar» en una dosis de otro día ni cruzar la medianoche (`horaParaPasar`). Lo atrasado se
  pregunta («¿Se la dieron?»), no se pospone.
- **Emergencia:** la ficha abre en lectura. Nada destructivo a un toque. La pestaña vuelve siempre al selector.
- **Copia local:** sólo familia, contactos y tratamientos; se borra al cerrar sesión. Con red, manda el servidor.
- **Texto:** voseo, sin género cuando no se sabe, botones con verbo + objeto, «sin cargar» ≠ «no tiene».

## 5. Deuda priorizada

| # | Qué | Tipo | Esfuerzo | Por qué importa |
|---|---|---|---|---|
| 1 | **Probar en el APK**: marcar/deshacer, ficha sin red (modo avión), notificación → día | QA | S | Lo nativo no se pudo verificar en web (07 §3) |
| 2 | Borrar la serie «Si» (grupo 3) y revisar los datos de demo | Dato | XS | Se ve como un bug en la demo (SIS-04) |
| 3 | **FAM-01** · quien crea el grupo queda como integrante (`Integrante.usuarioId`) | Backend + front | M | Hoy «Mi ficha» se busca por nombre y apellido |
| 4 | **Contraste alto (D2)**: interruptor en Cuenta; las pantallas tienen que leer el color de un contexto en vez de `colors.js` | Front transversal | M–L | Decisión tomada en la Fase 3; la paleta ya está (`colorAltoContraste`) |
| 5 | Migrar Cuenta, Detalle y formularios de salud a `tokens.js` (VIS-01 títulos serif, VIS-02 espaciado, CTA-01/03/04/06) | Front | M | Consistencia; hoy conviven dos sistemas |
| 6 | Sombras difusas en login, registro, bienvenida y `ConfirmModal` | Front | S | Checklist anti-vibecoded (07 §4) |
| 7 | CTA-07 rol «Sólo mira» (`lector`) y elegir el rol al invitar | Backend + front | M | Persona P3 (consulta a distancia) |
| 8 | FRM-05 cargar una dosis pasada · DOS-10 horarios rápidos y «Hasta [fecha]» | Backend + front | M | Fricción de J-B |
| 9 | SIS-03 Tab que cae en `body` · EME-07 ordenar contactos / marcar no vigentes · FAM-03 · FRM-02/04 | Front | S c/u | P2 |
| 10 | Tema oscuro | Front | L | Diferido en la Fase 3 (D2) |
| — | Validar las proto-personas con 5 entrevistas (guía en 01 §6) | Research | — | Todo el trabajo parte de hipótesis |

Marcadores en el código: `TODO(backend)` (buscar con `grep -rn "TODO(backend)" frontend/src backend/src`).

## 6. QA manual antes del merge

Cuentas locales: `monica@domus.test` / `Admin123` (Familia Argento, con datos), `lucia.vacia@domus.test` / `Admin123`
(familia vacía), `ramon.journey@domus.test` / `Ramon2026` (una sola persona).

**Web (1440 y 390 px) y Android:**

- [ ] Hoy: «Dada» en una dosis de hoy → toast con «Deshacer» → deshacer → vuelve a pendiente.
- [ ] Hoy: atrasada → «Sí, se la dieron» → «A horario (08:00)» → en el Calendario figura «Dada 08:00 · Mónica».
- [ ] Hoy: atrasada → «No se dio» → ⊖ en el Calendario; «Dosis dadas» del mes baja.
- [ ] «Pasar a las …» no aparece en dosis de otro día ni después de las 23:00; en turnos tampoco.
- [ ] Calendario: marcar no abre diálogo; filtros por nombre; «Filtrar» en el celular.
- [ ] Emergencia: 2 toques desde cualquier pantalla; volver a la pestaña muestra el selector.
- [ ] Ficha sin conexión: modo avión (o API caída) → abrir la app → Familia y ficha con aviso «Sin conexión…».
- [ ] Nueva dosis desde «Agregar → Medicación»: sin «Medicamento» no guarda; el toast repite lo cargado.
- [ ] Agregar persona → «Completar su ficha» abre su ficha.
- [ ] Eliminar un integrante con dosis programadas → desaparecen del Calendario.
- [ ] Errores: cortar la red y marcar → aviso de error (no de éxito) que queda hasta cerrarlo.
- [ ] Notificación (sólo APK): tocarla abre el Calendario en ese día.
- [ ] Teclado (web): Tab recorre todo con anillo visible; «Agregar» se abre con Enter, ↑ ↓ y Escape.
- [ ] Zoom 200 % (o 720 × 450): sin scroll horizontal en Familia, Calendario, Emergencia.

## 7. Demo

1. `docker compose up -d --build` y `npx expo start --web`.
2. Borrar la serie «Si»: `delete from recordatorio where descripcion = 'Si';` (grupo 3; revisar antes con un `select`).
3. Dejar 1 o 2 dosis atrasadas sin marcar en Familia Argento para mostrar «¿Se la dieron?».
4. Guion sugerido (≈ 4 min): Familia → marcar una dosis y deshacer → atrasada «a horario» → Emergencia (2 toques) →
   ficha en lectura → modo avión y volver a abrirla → Calendario con ✓ ⊖ ✕.

## 8. Capturas

`docs/ux/capturas/` pesa ≈ 140 MB (`antes/` 76 MB, `despues/` 56 MB, `comparacion/` 3,6 MB). En git está sólo
`comparacion/` (lo que se muestra); `antes/` y `despues/` quedan en `.gitignore` y viven en la máquina de Alan (se
regeneran con Playwright). Los documentos las nombran como evidencia: quien las necesite las pide o las regenera.
Para versionarlas igual, sacar las dos líneas de `.gitignore`.
