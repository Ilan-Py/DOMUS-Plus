# 01 · Usuarios y journeys (Fase 1)

> Skills: `design:user-research` + `design:research-synthesis`. `journey-mapping` no está instalada: los mapas se hicieron a mano
> con la misma estructura (etapa → acción → pensamiento → fricción → oportunidad).
> Fecha: 27/11/2026 · Rama `feature/familia-hoy`.

## 0. Método y límites

**No hubo investigación con usuarios.** Todo lo de este documento es **hipótesis** y se marca así. Se apoya en tres fuentes:

| Fuente | Qué aporta | Peso |
|---|---|---|
| Casos de uso del equipo (`docs/casos-de-uso/CU1`–`CU11`) | Actor único «Usuario», objetivos, reglas (fecha de nacimiento no futura, recordatorio no en el pasado, un grupo por usuario) | Requisitos, no comportamiento real |
| Conocimiento del dominio: cuidado familiar, polimedicación en adultos mayores, emergencias domésticas | Contexto, miedos, momentos de presión | Hipótesis a validar |
| **Recorridos reales en la app** (27/11, mobile 390 px, Edge con Playwright), código y capturas de la Fase 0 | Pasos, campos, textos y fricciones **observadas** | Evidencia dura sobre la interfaz, no sobre las personas |

Para cada afirmación se separa lo **observado** (pasó en la app: tiene captura, archivo o línea) de lo **interpretado** (lo que
suponemos que siente o necesita la persona). La §7 propone cómo validarlo en una semana, con lo que un equipo académico puede hacer.

Cuentas creadas para recorrer los journeys (sólo en la base local): `ramon.journey@domus.test` · «Familia Quiroga», con un perfil
dependiente «Nélida Quiroga» (80 años) y un recordatorio diario de medicación desde el 28/11.

---

## 1. Proto-personas (hipótesis)

### P1 · Mónica, 41 · La que coordina (dueña del grupo)

> *Hipótesis.* «Si no lo anoto yo, nadie se acuerda.»

| | |
|---|---|
| Contexto | Trabaja de 9 a 18. Dos hijos (19 y 9), suegra de 79 que vive con ellos, perro y gato. Es la que saca turnos, compra remedios y lleva la carpeta de estudios |
| Dispositivos | Android de gama media todo el día, notebook a la noche para «ordenar» |
| Soltura digital | Alta. Usa WhatsApp, home banking y Mi Argentina |
| Objetivos | Que nada se le pase (dosis, vacunas, turnos). Repartir tareas sin explicar todo cada vez. Tener todo en un lugar cuando un médico pregunta «¿qué toma?» |
| Miedos | Que la suegra tome dos veces la pastilla o ninguna. Que en una guardia no sepan que tiene marcapasos. Cargar todo y que nadie más lo use |
| Momento típico | Domingo a la noche: carga la semana. Martes 8:05, en el colectivo: «¿le dieron el Losartán?» |
| Qué necesita de DOMUS+ | Ver qué falta hoy en 3 segundos. Cargar rápido un tratamiento que se repite. Saber **quién** marcó una dosis y **cuándo** |
| Encaje actual (observado) | Familia muestra «Hoy» y alertas arriba (`datos-familia.png`). **Pero:** «Hecho» no dice quién lo marcó, no se puede deshacer (`CalendarScreen.js:241`) y la medicación no tiene nombre ni dosis propios (ver J2) |

### P2 · Héctor, 74 · El cuidador mayor

> *Hipótesis.* «No quiero tocar algo y que se borre.»

| | |
|---|---|
| Contexto | Jubilado. Cuida a su esposa Nélida (80), con hipertensión y gotas para glaucoma. Los hijos viven lejos y le instalaron la app |
| Dispositivos | Celular con letra agrandada y el brillo bajo. Usa anteojos de cerca y a veces no los encuentra |
| Soltura digital | Baja. WhatsApp con audio y poco más. Desconfía de los botones que «hacen cosas solos» |
| Capacidades | Baja visión (presbicia, posible cataratas), menos precisión con el dedo y menos memoria de trabajo. Lee despacio y con atención |
| Objetivos | Saber si ya le dio la pastilla de la mañana. Tener a mano lo que tiene que decir si llama al SAME |
| Miedos | Equivocarse de dosis. Borrar algo sin querer. Que la app le hable en «idioma de computadora» |
| Momento típico | 8:00, cocina, una mano ocupada con el vaso de agua. 3:00 de la mañana, Nélida se descompensa |
| Qué necesita de DOMUS+ | Un solo lugar con «lo de hoy» en letra grande. Confirmar una toma sin dudas y poder corregirla. La ficha de emergencia **sin buscar** |
| Encaje actual (observado) | Existe «Tamaño de texto» hasta ×1,3 (`escalaTexto.js`) y los botones de «Hoy» miden 48 px (`FamiliaHoy.js:282`). **Pero:** «Venció mar 24» se lee como «24 de marzo» (`FamiliaHoy.js:136`); la ficha de María Elena queda a 1801 px de la parte de arriba en un viewport de 844 (≈ 2 pantallas de scroll); en la ficha, el lápiz y el tacho están al lado de cada teléfono (`datos-emergencia.png`) |

### P3 · Martín, 38 · El que consulta a distancia

> *Hipótesis.* «Sólo quiero saber si mamá está bien, sin molestar.»

| | |
|---|---|
| Contexto | Hijo de Héctor y Nélida, vive en otra provincia. Entra un par de veces por semana o cuando recibe un audio preocupante |
| Dispositivos | iPhone. Lo abre desde una notificación o un link que le manda alguien |
| Soltura digital | Alta, pero con **poca familiaridad con la app**: no la usa todos los días |
| Objetivos | Ver si las dosis se están tomando (adherencia) y cuándo es el próximo turno. Tener la ficha por si tiene que hablar con una guardia por teléfono |
| Miedos | Cambiar algo sin querer y desordenar lo que carga su padre. Enterarse tarde |
| Qué necesita de DOMUS+ | Leer sin poder romper nada. Un resumen de la semana: tomadas, olvidadas, próximas |
| Encaje actual (observado) | Al unirse con código queda como `miembro`, con **los mismos permisos de edición y borrado** que cualquiera, salvo los de grupo (`TODO_BACKEND_REDISENO.md`, «Roles extra… Cuidador de sólo lectura»). La grilla muestra ✓ ✕ por día (`datos-calendario-mes.png`), pero en el mes los eventos se truncan a «↻08:…» y no se lee qué fue lo que se omitió |

### Personas secundarias (no se diseñan para ellas, pero se cuidan)

- **Paola, 19**: hija con cuenta, carga lo suyo y la vacuna del perro. Es la que más rápido detecta lo que «se ve viejo».
- **Profesional de guardia o paramédico**: nunca usa la app, pero **lee la ficha** en la pantalla de otra persona, de pie y apurado.
  Su necesidad define el diseño de la ficha: sangre, alergias, medicación actual, condición crítica y a quién llamar, en ese orden.

---

## 2. Jobs to be done

Formato: *Cuando… quiero… para…* La frecuencia y la persona principal son hipótesis. La columna «Hoy» es observada.

| # | Job | Persona | Frecuencia | Hoy en la app (observado) | Brecha |
|---|---|---|---|---|---|
| J1 | **Cuando** llega la hora de una toma, **quiero** dejar registrado que se dio, **para** que nadie la repita ni la saltee | P2, P1 | Varias veces por día | «Hecho» en «Hoy» (1 toque, sin confirmación) o en Calendario (con confirmación) | No se puede deshacer. No queda quién ni a qué hora real. No existe «omitida». Los dos lugares se comportan distinto |
| J2 | **Cuando** arranca el día (o me preocupo), **quiero** ver qué toca hoy y qué quedó sin hacer, **para** quedarme tranquilo | P1, P2, P3 | Diaria | «Hoy en tu familia» + alertas en Familia | Mezcla vencidos de otros días con los de hoy, y la bandera los cuenta como «hoy». El vencido no dice «hace 3 días» |
| J3 | **Cuando** me dan un turno o una receta, **quiero** cargarlo en el momento, **para** no olvidarme | P1 | Semanal | «+ Agregar» → formulario de recordatorio | El nombre de la medicación y la dosis no existen como campos: van a «Descripción (opcional)». Si se deja vacío, el evento se llama «Recordatorio» |
| J4 | **Cuando** hay una emergencia, **quiero** mostrar la ficha de la persona en segundos, **para** que la atiendan bien | P2, P1, guardia | Rara y crítica | Botón «Emergencia» en cada tarjeta de Familia | Hay que encontrar la tarjeta (scroll). La ficha no muestra la medicación actual ni la edad. No hay acceso sin sesión ni desde la pantalla bloqueada |
| J5 | **Cuando** alguien más ayuda a cuidar, **quiero** sumarlo al grupo, **para** repartir el trabajo | P1 | Pocas veces | Código de invitación (sidebar, Cuenta, «+ Agregar») | Tres puntos de entrada distintos. Hay que tipear el código, no hay link. Sin permisos de sólo lectura |
| J6 | **Cuando** cuido a alguien que no va a usar la app (un chico, un abuelo, una mascota), **quiero** crearle un perfil, **para** llevar su salud | P1, P2 | Al empezar | «Perfil sin cuenta» / «Agregar persona» / «Agregar mascota» | Funciona. El perfil queda con «Ficha al 0 %» y nada invita a completarla |
| J7 | **Cuando** un médico pregunta «¿qué vacunas tiene?» o «¿qué toma?», **quiero** encontrarlo rápido, **para** responder bien | P1 | Mensual | Detalle → Vacunas / Tratamientos / Historial | Correcto, pero los tratamientos y los recordatorios de medicación no están conectados en la interfaz |

---

## 3. Journey maps

Leyenda: ⚠ momento de ansiedad · ✋ fricción observada · 💡 oportunidad.
«Pasos» = pantallas recorridas; «acciones» = toques, tipeos y selecciones.

### J-A · Onboarding y crear la familia

Recorrido real: cuenta nueva «Ramón Quiroga», mobile 390.

| Etapa | Acción | Pantalla / evidencia | Pensamiento (hipótesis) | Fricción | Oportunidad |
|---|---|---|---|---|---|
| Descubrir | Abre la app | Bienvenida (`auth-bienvenida.png`): hero, 3 beneficios, «Cómo funciona», vista previa de la ficha | «¿Esto es para mí?» | La página es larga para una app ya instalada: el CTA principal compite con 3 tarjetas que también son botones | 💡 Un CTA dominante arriba; las tarjetas como contenido, no como botones |
| Registrarse | «Crear cuenta» → nombre, apellido, email, contraseña | `RegisterScreen.js` (4 campos) | «Otra contraseña más…» | ✋ Con una contraseña corta, el error dice «mirá los que siguen en gris debajo»: depende del color (WCAG 1.4.1). Con el formulario vacío no se vio un error en el snapshot (a confirmar en la Fase 2) | 💡 Requisitos con ícono ✓/✕ y texto, no sólo color |
| Crear grupo | Nombre del grupo → «Crear grupo» | `onboarding-grupo.png` | «¿Qué nombre le pongo?» | Bien: 1 campo, placeholder «Familia Pérez». El segmentado «Crear / Unirme» deja la otra opción a la vista | — |
| Llegar | Familia vacía | `vacio-familia.png` | «¿Y ahora?» | ✋ **El dueño no queda cargado como integrante**: «0 integrantes». Su ficha propia se busca **por nombre y apellido** (`AccountScreen.js:220`): si se carga como «Moni», no la encuentra. ✋ Bandera con «0 dosis hoy · 0 turnos · 0 fichas»: ruido. ✋ En mobile, «Esta semana» (vacía) aparece después del estado vacío | 💡 Al crear el grupo, ofrecer «¿Te sumás vos también?» con los datos de la cuenta. `TODO(backend)`: vincular `Integrante.usuarioId` |
| Primer integrante | «Agregar un familiar» → Persona / Mascota, ícono, nombre, apellido, fecha, observaciones → Guardar | `journey4-tras-alta-dependiente.png` | «Listo, ¿ya está?» | ✋ El formulario no pide sangre, alergias ni contacto: la ficha queda al 0 % y **nada invita a completarla**. La pantalla vuelve con el scroll donde estaba | 💡 Después de guardar: «Nélida ya está. ¿Completamos su ficha de emergencia? (2 min)» |

**Línea de base:** 4 pantallas hasta la familia vacía y 10 acciones (1 + 4 campos + enviar + 1 campo + crear + 2 de navegación).
Primer integrante: +6 acciones. **Ficha de emergencia completa: no forma parte del flujo.**

⚠ El momento de ansiedad de este journey no está en el registro: aparece **después**, cuando la familia está «cargada» pero las fichas
están vacías y nadie lo nota hasta que hacen falta.

### J-B · Agregar medicación recurrente y marcar la toma

Recorrido real: «Familia Quiroga» → «+ Agregar» → Medicación, para Nélida, todos los días a las 08:00 desde el 28/11.

| Etapa | Acción | Pantalla / evidencia | Pensamiento (hipótesis) | Fricción | Oportunidad |
|---|---|---|---|---|---|
| Iniciar | «+ Agregar» → «Medicación» | Menú (`datos-familia-menu-agregar.png`) → `journey2-form-desde-menu.png` | «Tengo la receta acá» | Bien: el tipo «Medicación» viene marcado. ✋ Desde Calendario, «+ Agregar» abre el formulario directo y con **«Control» marcado** (`datos-alta-recordatorio.png`) | 💡 Un solo «+ Agregar» que se comporte igual en todas las pantallas |
| ¿Para quién? | Toca «Nélida» | Chips de persona | — | ✋ Con un solo integrante, igual hay que elegirlo | 💡 Preseleccionar si hay uno solo o si se entra desde su perfil |
| ¿Qué remedio? | — | **No hay campo** | «¿Dónde pongo Enalapril 10 mg?» | ✋ **El nombre y la dosis no existen.** El único texto libre es «Descripción (opcional)». Si se deja vacío, el evento se llama **«Recordatorio»** (observado en la tarjeta: «Recordatorio · sáb 28 · 08:00»). De ahí sale el «Si» de la Fase 0 | 💡 Campos «Medicamento» (obligatorio para Medicación) y «Dosis». Opcional: vincular a un Tratamiento existente |
| ¿Cuándo? | Fecha (selector nativo) + hora (2 selects: 24 horas y **60 minutos**) | `AddReminderScreen.js` | «¿Y si son dos veces por día?» | ✋ El select de minutos tiene 60 opciones. ✋ No hay «2 veces por día» (08:00 y 20:00): hay que crear dos series. ✋ No acepta fechas pasadas (`recordatoriosController.js:74`): no se puede cargar un tratamiento que empezó ayer | 💡 Horarios rápidos (08:00 · 14:00 · 20:00) + «agregar otro horario» |
| ¿Cuánto dura? | «Todos los días» → «Cuántas veces en total» (placeholder «Ej. 10…») | idem | «Es para siempre, ¿pongo 1000?» | ✋ Se piensa en «hasta cuándo» o «sin fecha de fin», no en «cuántas veces». Máximo 100 (`CLAUDE.md`, MEJ-005) | 💡 «Hasta: [fecha] · Sin fecha de fin». `TODO(backend)`: serie sin fin o renovable |
| Confirmar | «Guardar» | Vuelve a Familia | «¿Se guardó bien?» | El toast de confirmación no llegó a verse en la captura (a revisar en la Fase 2) | 💡 Toast con resumen: «Enalapril 10 mg · todos los días 08:00, desde mañana» |
| **Marcar la toma** | En «Hoy»: «Hecho» | `FamiliaHoy.js:63` (1 toque, sin confirmación, toast «Listo, lo marcaste como hecho») | ⚠ «¿Lo marqué o no lo marqué?» | ✋ **No se puede deshacer** (en Calendario se avisa «Esto no se puede deshacer desde la app», `CalendarScreen.js:241`; en «Hoy» ni se avisa). No queda quién ni a qué hora. Si se toca por error, la dosis figura como dada | 💡 «Hecho» con **Deshacer** en el toast (5 s) y en el evento: «Dado 08:12 por Héctor». `TODO(backend)`: `tomado_a`, `tomado_por`, estado `omitido` |
| Corregir | «Más tarde» | `FamiliaHoy.js:79`: corre la hora +1 h | «Se la doy después de desayunar» | ✋ En un vencido de hace 3 días, «Más tarde» lo pasa a dentro de 1 hora: no es lo que la persona quiere decir («ya pasó, no se dio») | 💡 Para los vencidos: «Se dio» / «No se dio», no «Más tarde» |

**Línea de base:** 1 menú + 1 formulario con 7 decisiones (persona, tipo, fecha, hora, minutos, repetición, cantidad), 0 campos para
el remedio. Marcar: 1 toque, irreversible.

⚠ **Mayor ansiedad del producto:** la doble dosis. Es lo único donde un error de interfaz puede hacer daño físico. J-B es el
journey crítico.

### J-C · Emergencia: mostrar la ficha en menos de 10 segundos

Recorrido real: sesión de Mónica, mobile 390 × 844, mostrar la ficha de María Elena.

| Etapa | Acción | Pantalla / evidencia | Pensamiento (hipótesis) | Fricción | Oportunidad |
|---|---|---|---|---|---|
| Disparador | Desmayo, caída, guardia | — | ⚠ Pánico, manos temblando, alguien pregunta «¿qué toma? ¿es alérgica?» | — | — |
| Abrir | Desbloquear el teléfono y abrir DOMUS+ | Sesión persistida (si venció, hay que loguearse: imposible en 10 s) | «¿Dónde estaba?» | ✋ Sin acceso desde la pantalla bloqueada, widget ni atajo | 💡 Atajo «Emergencia» siempre visible (barra inferior o botón fijo). `TODO(backend)`: QR o link de sólo lectura |
| Encontrar a la persona | Scroll en Familia hasta la tarjeta | Botón «Ficha de emergencia de María Elena Argento» en **y = 1801 px** (viewport 844) | «¿Cuál es? ¿Dónde?» | ✋ Antes aparecen bandera, alertas, «Hoy» y otras 2 tarjetas. En mobile, ≈ 2 pantallas de scroll | 💡 Selector de emergencia: un toque → caras de la familia en grande → ficha |
| Leer la ficha | Ficha | `mobile/datos-emergencia.png` | «Leelo vos» | Bien: sangre A+ grande, alergias en chips, notas, contactos llamables. ✋ **No muestra la medicación actual** (va mezclada en las notas libres) ni la edad. ✋ Lápiz y tacho al lado de cada teléfono: un toque de más borra un contacto. ✋ El teléfono se corta en 2 líneas («+54 9 11 5555- / 1201»). ✋ Doble acento (borde superior terracota + tarjeta) | 💡 Modo lectura sin acciones de edición. Orden fijo: nombre + edad, sangre, alergias, **medicación actual** (desde los tratamientos activos), condiciones, contactos |
| Llamar | Toca un contacto | `tel:` | — | Bien. ✋ «Rosa Benítez · Vecina (se mudó)»: no hay forma de marcar un contacto como no vigente | — |

**Línea de base:** con la sesión abierta, 1 toque en Familia + ≈ 2 scrolls + 1 toque ≈ **6–12 s** para alguien que sabe dónde está y
está tranquilo (estimado, no cronometrado con usuarios). Bajo presión y con 5 tarjetas, **no se cumple de forma confiable**.

### J-D · Invitar a un familiar o crear un perfil dependiente

**D1 · Invitar (persona con cuenta).** Recorrido por código: `AccountScreen.js:417-442`, `SideBar.js:96-105`, `RegisterScreen.js:123`.

| Etapa | Acción | Evidencia | Pensamiento (hipótesis) | Fricción | Oportunidad |
|---|---|---|---|---|---|
| Decidir | «Quiero que mi hermano vea esto» | — | «¿Va a poder borrar cosas?» | ✋ No hay roles: todo miembro edita y borra integrantes, fichas y recordatorios | 💡 Elegir el rol al invitar: «Puede editar» / «Sólo mira». `TODO(backend)`: rol `lector` |
| Generar el código | Sidebar «Copiar código» · Cuenta «Invitar miembro» · «+ Agregar» → «Integrante con cuenta» | `datos-familia-menu-agregar.png`, `datos-cuenta.png` | «¿Cuál uso?» | ✋ 3 entradas que hacen casi lo mismo con distinto texto («Sumá a tu familia», «Invitar miembro», «Integrante con cuenta») | 💡 Una sola acción, «Invitar a alguien», en el menú global y en Cuenta |
| Enviar | Copiar o compartir (Share nativo en el celular) | `AccountScreen.js:438` | «Se lo mando por WhatsApp» | ✋ Se manda un **código** para tipear, no un link. El código no vence (`TODO_BACKEND_REDISENO.md`) | 💡 Mensaje armado: «Te invito a la familia Argento en DOMUS+. Código: X» |
| Unirse (el invitado) | Bienvenida → «Me invitaron…» → código → registro → entra | `RegisterScreen.js:123`: «Cuando termines, te unís al grupo con el código…» | «¿Es seguro?» | Bien resuelto: el código se guarda y se aplica después del registro | — |
| Ver al nuevo | Cuenta → Miembros | `datos-cuenta.png`: «Grupo familiar · **2 integrantes**» | — | ✋ En Familia son «5 integrantes»: la misma palabra para cuentas y para personas cuidadas | 💡 «2 personas con acceso» vs «5 integrantes» |

**D2 · Perfil dependiente (sin cuenta).** Recorrido real: «Agregar un familiar» → Persona → «Nélida Quiroga», 02/03/1946 → Guardar.

| Etapa | Acción | Evidencia | Fricción | Oportunidad |
|---|---|---|---|---|
| Entrar | «+ Agregar» → «Perfil sin cuenta», slot «Agregar persona» o Cuenta → «Agregar perfil sin cuenta» | 3 entradas | Aceptable: la del slot es la más natural | — |
| Cargar | Ícono (8 opciones), nombre, apellido, fecha, observaciones | `AddMemberScreen.js` | ✋ El tipo (menor/adulto/mayor) se calcula bien solo. ✋ No pide parentesco (CU4 lo lista como obligatorio). ✋ Nada de emergencia | 💡 Paso 2 opcional: «Datos para una emergencia» |
| Resultado | Tarjeta «Nélida Quiroga · Mayor · 80 años · Ficha al 0 %» | `journey4-tras-alta-dependiente.png` | ✋ «Ficha al 0 %» como barra gris sin acción | 💡 «Completar ficha» como acción principal de la tarjeta mientras esté < 100 % |

**Línea de base:** D1 de 1 a 3 acciones para generar el código según la entrada, más el registro del invitado. D2: 2 toques + 4 campos + guardar = 7 acciones.

---

## 4. Síntesis: temas

### Tema 1 · La medicación no es un dato de primera clase
**Evidencia:** el formulario no tiene campo de medicamento ni de dosis (J-B). El título por defecto es «Recordatorio». Hay recordatorios
«Si» en datos reales de prueba (Fase 0). La ficha no muestra la medicación actual (J-C). Los Tratamientos existen en el modelo pero
no están conectados al calendario en la interfaz.
**Implicación:** el job más frecuente (J1) y el más crítico (J4) dependen de un dato que hoy es texto libre opcional.

### Tema 2 · Marcar una dosis tiene que ser reversible y trazable
**Evidencia:** «Hecho» es irreversible, se comporta distinto en «Hoy» y en Calendario, no guarda quién ni cuándo, y «Más tarde» sobre
un vencido de días atrás no tiene sentido.
**Implicación:** con más de un cuidador (P1 + P2 + P3), sin trazabilidad la app puede **causar** la doble dosis que busca evitar.

### Tema 3 · La emergencia está enterrada
**Evidencia:** la ficha es buena una vez abierta, pero está a ≈ 2 pantallas de scroll y detrás de la tarjeta correcta. Tiene acciones
de edición y borrado en el modo lectura.
**Implicación:** el journey más crítico depende de que la persona recuerde dónde está la ficha. Hace falta un camino fijo.

### Tema 4 · El modelo «cuenta ≠ integrante» se filtra a la interfaz
**Evidencia:** el dueño no queda como integrante. «Mi ficha» se resuelve por coincidencia de nombre. «2 integrantes» (cuentas) contra
«5 integrantes» (personas). Hay 3 formas de invitar.
**Implicación:** confusión de vocabulario y fichas propias que «desaparecen» si el nombre no coincide.

### Tema 5 · El cuidador mayor está contemplado a medias
**Evidencia (a favor):** tamaño de texto ×1,3, botones de 48 px en «Hoy», teléfonos grandes en la ficha, textos con voseo claro.
**Evidencia (en contra):** fechas abreviadas ambiguas («mar 24»), mensajes que dependen del color, controles densos en el
Calendario mobile (≈ 520 px antes del primer evento), acciones destructivas pegadas a las de lectura.
**Implicación:** la base está, falta aplicar el criterio en cada pantalla. Va a la auditoría (Fase 2).

## 5. Insights → oportunidades

| Insight | Oportunidad | Impacto | Esfuerzo | Fase |
|---|---|---|---|---|
| La medicación es texto libre opcional | Campos «Medicamento» y «Dosis» en AddReminder (obligatorio si el tipo es Medicación); título derivado | Alto | Bajo (front) / Medio si se vincula a Tratamiento | 3 y 6 |
| «Hecho» irreversible y sin autor | Toast con «Deshacer» (el front reactiva con `PATCH`) + `TODO(backend)` para `tomado_por` / `tomado_a` / `omitido` | Alto | Bajo (deshacer) / Medio (backend) | 6 |
| La ficha se encuentra por scroll | Acceso fijo «Emergencia» (barra o FAB) → selector de persona → ficha | Alto | Medio | 3 y 6 |
| La ficha mezcla lectura y edición | Modo lectura limpio, edición detrás de «Editar» | Alto | Bajo | 6 |
| La ficha no muestra medicación ni edad | Sumar «Toma actualmente» (tratamientos activos) y la edad | Alto | Bajo (los datos existen) | 6 |
| «Hoy» mezcla días y la fecha es ambigua | Separar «Hoy» de «Quedó sin marcar»; fechas relativas («hace 3 días», «martes 24/11») | Medio | Bajo | 6 |
| El dueño no es integrante | Ofrecer «Sumarme» al crear el grupo; `TODO(backend)`: `Integrante.usuarioId` | Medio | Bajo / Medio | 6 |
| Las fichas quedan al 0 % sin aviso | «Completar ficha» como siguiente paso tras crear un perfil y como acción de la tarjeta | Medio | Bajo | 3 y 6 |
| Tres formas de invitar con tres nombres | Una acción, «Invitar a alguien», con mensaje armado | Medio | Bajo | 3 y 5 |
| Nadie puede «sólo mirar» | Rol «Sólo mira» al invitar (`TODO(backend)`) | Medio | Medio (backend) | 8 |
| Repetición por «cantidad de veces» | «Hasta [fecha] / Sin fin»; varios horarios por día | Medio | Medio | 3 |

## 6. Recomendaciones para las fases siguientes

1. **Prioridad alta: J-B y J-C como P0 de experiencia.** Son los únicos donde un error de interfaz puede tener consecuencias de salud.
   La auditoría (Fase 2) los revisa primero y la implementación (Fase 6) los ataca después de los bugs P0.
2. **Prioridad alta: el vocabulario.** Fijar en la Fase 5: integrante (persona o mascota cuidada) · persona con acceso (cuenta) ·
   dosis / toma · turno · control · ficha de emergencia. Una palabra por concepto.
3. **Prioridad media: «Hoy» como checklist honesto.** Sólo hoy; lo vencido, aparte y con su fecha real; acciones según el caso
   (futuro: nada · hoy: Hecho/Más tarde · vencido: Se dio/No se dio).
4. **Prioridad media: el onboarding termina con fichas útiles**, no con una familia vacía o con fichas al 0 %.
5. **Prioridad baja (handoff):** roles, link de invitación y QR de emergencia dependen del backend: van como `TODO(backend)`.

## 7. Qué validar y cómo (barato, en una semana)

| Hipótesis | Cómo validarla | Señal de que es cierta |
|---|---|---|
| El cuidador mayor confunde «mar 24» | Test de 5 segundos con 3 personas de más de 65: mostrar la tarjeta «Venció mar 24 · 08:00» y preguntar «¿cuándo era?» | 2 de 3 o más dicen «marzo» |
| La ficha no se encuentra en menos de 10 s | Test de tarea con 5 personas (2 mayores): «Mostrale al médico la ficha de María Elena», cronometrado | Mediana > 10 s o algún abandono |
| La gente escribe el remedio en «Descripción» o lo deja vacío | Tarea: «Cargá que Nélida toma Enalapril 10 mg a las 8 y a las 20» | Menos de 4 de 5 lo completan sin ayuda |
| Tocar «Hecho» por error pasa y angustia | Preguntar en entrevista: «¿Qué harías si lo tocaste sin querer?» | Respuestas tipo «no sé», «lo borro» |
| Los familiares a distancia quieren sólo mirar | 3 entrevistas cortas con hijos de cuidadores | Mencionan miedo a «tocar algo» |

**Guía corta de entrevista (20 min):**
1. *Contexto (5'):* «Contame cómo se organizan hoy con los remedios y los turnos de [persona]. ¿Dónde lo anotan?»
2. *Último incidente (5'):* «¿Cuándo fue la última vez que se pasó una dosis o se dio dos veces? ¿Cómo se dieron cuenta?»
3. *Emergencia (5'):* «Si mañana hay que ir a la guardia, ¿qué les van a preguntar? ¿Dónde está esa información?»
4. *Tarea en la app (5'):* uno de los tests de la tabla, pensando en voz alta.

## 8. Preguntas abiertas

- ¿Los cuidadores marcan las dosis **en el momento** o al final del día? Esto cambia si «Hecho» necesita hora real.
- ¿Cuántos cuidadores por persona dependiente hay en una familia típica? Más de uno hace crítica la trazabilidad.
- ¿Una mascota con medicación diaria se vive igual que una persona? Hoy la app las trata igual (bien), pero la ficha de emergencia
  de una mascota tiene otros datos (veterinario, peso).
- ¿Es aceptable un QR o link de emergencia sin sesión? Tiene un costo de privacidad: decisión del equipo, no de diseño.
