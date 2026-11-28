# 05 · Copy — voz, vocabulario y textos de DOMUS+

> Fase 5 del review UI/UX. Este documento fija **cómo habla la app** y trae el antes/después de los textos que se tocan en la
> Fase 6. Las referencias `DOS-xx`, `EME-xx`, etc. son hallazgos de [02-auditoria.md](02-auditoria.md); `COP-xx` son hallazgos
> nuevos de esta fase. Relevamiento: `grep` de `mostrarToast`, `confirmarDestructivo`, `elegirOpcion`, `ErrorBanner`,
> `EmptyState`, `label=`/`title=`/`placeholder=` y los `<Text>` literales de `screens/`, `components/` y `navigation/`, más los
> mensajes de `authController` y `recordatoriosController` que llegan a la pantalla (`client.js:72` muestra `datos` tal cual en los 4xx).

---

## 1. Voz

DOMUS+ habla como **alguien de la familia que es ordenado**: sabe dónde está cada papel, no se pone nervioso y no reta.

| Es | No es |
|---|---|
| Claro: dice qué pasó, a quién y cuándo | Técnico («recordatorio desactivado», «registro», «evento») |
| Tranquilo, también cuando algo falla | Alarmista («¡Atención!», «Error crítico») |
| Concreto: nombres, horas, medicamentos | Genérico («Elemento eliminado», «Operación exitosa») |
| Rioplatense con voseo (podés, probá, fijate) | Neutro de doblaje (puedes, intenta) ni lunfardo |
| Cálido en los vacíos y en la bienvenida | Empalagoso en las acciones («¡Genial! 🎉») |

### Tono según el momento

| Momento | Tono | Ejemplo |
|---|---|---|
| Acción hecha | Breve, dice el resultado y ofrece volver atrás | «Losartán de María Elena: dada a las 08:00» · **Deshacer** |
| Error | Qué pasó + qué hacer. Sin culpas ni códigos | «No pudimos guardar la marca. Revisá la conexión y probá de nuevo.» |
| Aviso antes de algo irreversible | Nombra la cosa y la consecuencia | «¿Eliminar a José Argento? Se borran sus vacunas, tratamientos, historial y documentos.» |
| Vacío | Qué va acá + cómo empezar | «Todavía no hay contactos. Sumá a quién llamar si a Nélida le pasa algo.» |
| Emergencia | Lo mínimo, en orden de importancia. Sin adornos | «Tipo de sangre A+ · Alérgica a penicilina · Toma Losartán 50 mg» |
| Bienvenida / onboarding | Cálido, una idea por pantalla | «Acá vas a reunir a las personas y mascotas que cuidás.» |

---

## 2. Reglas de escritura

1. **Voseo siempre**, también en la ayuda y en los `accessibilityLabel`: «Escribí», «Elegí», «Podés». Nunca «debe», «ingrese», «usted».
2. **Sin género cuando no se sabe**: «Invitá a alguien», «Te invitaron», «Quien creó el grupo». Evitar «Invitalo», «Sos el dueño»,
   «Bienvenido». Con nombre conocido, concordar con la persona sólo si el dato existe; si no, reformular («Alergias de Nélida»).
3. **Botones con verbo y objeto**: «Guardar vacuna», «Eliminar a José», «Marcar como dada». «Aceptar», «OK», «Sí» y «Confirmar»
   no se usan. «Guardar» y «Cancelar» solos se aceptan dentro de un formulario con título.
4. **Nada de «¿Seguro que querés…?»**: la pregunta es la acción («¿Eliminar a José Argento?») y el cuerpo es la consecuencia.
5. **El «+» va en el ícono, no en el texto**: «Agregar», no «+ Agregar» (el lector de pantalla lee «más agregar»).
6. **Fechas** (`utils/formato.js`): relativas hasta 6 días («hoy», «mañana», «ayer», «hace 3 días», «el jueves»); después,
   «martes 24/11». **Nunca** «mar 24» (se lee «marzo», DOS-07). Horas en 24 h con dos dígitos: «08:00».
7. **Números y plurales** con `plural()`: «1 dosis», «2 dosis», «1 integrante», «3 integrantes». Con cero, no se muestra el
   contador (FAM-02) o se dice en palabras («Nada pendiente hoy»).
8. **Mayúsculas**: oración normal en todo («Ficha de emergencia», no «Ficha De Emergencia»). Las versalitas (sobretítulo)
   son estilo, no se escriben en mayúscula en el código. Los nombres de medicamentos, vacunas y siglas **se muestran como se
   cargaron** (FRM-03: «VNC20» no pasa a «vnc20»).
9. **Puntos**: sin punto final en títulos, botones, chips y toasts de una frase. Con punto en párrafos y en mensajes de
   error de dos frases.
10. **Sin emojis**, sin signos de exclamación salvo en la bienvenida (máximo uno por pantalla).
11. **Datos sin cargar ≠ «no tiene»**: «Alergias: sin cargar» no es lo mismo que «No tiene alergias conocidas». La app
    nunca transforma un vacío en una afirmación médica (ver §4.2).

---

## 3. Vocabulario único

Reemplaza a la tabla de [03-definicion.md §1.3](03-definicion.md). Donde difiere, manda esta.

| Concepto | Se dice | No se dice | Por qué |
|---|---|---|---|
| Persona o mascota que se cuida | **integrante** | miembro, perfil, usuario | «Miembro» ya es el rol de cuenta |
| Integrante sin cuenta propia | **persona sin cuenta** | perfil sin cuenta, dependiente | «Perfil» no le dice nada a Héctor (P2). *Cambia 03 §1.3*, que decía «perfil sin cuenta»; `AddMenu` ya usa esta |
| Persona con cuenta en el grupo | **persona con acceso** | integrante, miembro (en la interfaz) | CTA-02: «2 integrantes» en Cuenta contra «5 integrantes» en Familia |
| El grupo | **tu familia** (en frases) · **grupo familiar** (en ajustes) | grupo, hogar | — |
| Roles (D3) | **Creó el grupo** · **Coordina** · **Puede editar** · **Sólo mira** (`TODO(backend)` CTA-07) | Dueño, Admin, Miembro | «Dueño» tiene género y suena a propiedad; «Admin» choca con el admin del sistema |
| Aviso de medicación | **dosis** | recordatorio, evento, toma | Una sola palabra para la cosa. «Toma» se deja (03 decía las dos): sobraba |
| Aviso de médico | **turno** (con día y hora) · **control** (de rutina) | cita, evento | — |
| Aviso de vacuna | **vacuna** (aplicar) · **próxima dosis** (de una vacuna) | refuerzo, recordatorio | — |
| Cualquier aviso, cuando hay que nombrarlos juntos | **lo programado** · **avisos** | recordatorios, eventos | Sólo en títulos genéricos («Esta semana», «Nada programado») |
| Marcas de una dosis | **dada** · **no se dio** · **sin marcar** (pasó la hora) · **pendiente** (hoy, falta la hora) · **próxima** | hecho, completado, vencido, finalizado | DOS-03/04: «Hecho» decía cosas distintas en Hoy y Calendario |
| Marca de un turno o vacuna | **hecho** · **no fue** · **sin marcar** | completado, asistido | Un turno no «se da» |
| La ficha | **ficha de emergencia** | resumen, datos médicos, perfil médico | — |
| Secciones de la ficha | **Toma actualmente** · **Alergias** · **Tipo de sangre** · **Para tener en cuenta** · **A quién llamar** | Grupo sanguíneo, Notas médicas, Notas de emergencia, Contactos de emergencia | Hoy conviven «Tipo de sangre» y «Grupo sanguíneo» (bienvenida), y «Notas de emergencia» (form) con «Notas médicas» (vista) |
| Código para sumarse | **código de invitación** | código de grupo, código | — |
| Sacar a alguien del grupo | **quitar del grupo** | eliminar miembro | No se borra a la persona: pierde acceso |
| Borrar un dato | **eliminar** | borrar, remover, dar de baja | — |
| Posponer | **pasar a las [hora]** | más tarde, posponer, snooze | Dice cuándo (DOS-01) |
| Adherencia | **dosis dadas** | adherencia, cumplimiento | Jerga de salud |

---

## 4. Antes y después

Prioridad: **P0/P1** van en la Fase 6 junto con el arreglo de la pantalla; **P2** se aplican cuando se toca ese archivo.

### 4.1 Marca de dosis (P0 — DOS-01/02/03/04/05/06/07)

| Dónde | Antes | Después | Notas |
|---|---|---|---|
| Hoy · título | Hoy en tu familia | **Hoy** · bajada «sábado 28/11» | La bandera ya dice de quién es la familia |
| Hoy · grupo de atrasadas | (mezclado con hoy) | **Quedó sin marcar** | DOS-06 |
| Hoy · fila vencida | Venció mar 24 · 08:00 | **Era el martes 24/11 a las 08:00 · hace 4 días** | DOS-07 |
| Hoy · fila de hoy, pasó la hora | Venció hoy · 08:00 | **Sin marcar · era a las 08:00** | — |
| Hoy · fila de hoy, falta | Hoy · 20:00 | **20:00** (pendiente) · «en 2 h» si falta menos de 3 h | — |
| Botón principal (hoy) | Hecho | **Dada** · label «Marcar como dada: Losartán, María Elena» | — |
| Botón secundario (hoy) | Más tarde | **Pasar a las 21:30** (hora calculada, nunca después de 23:59) | DOS-01. Si no hay hora posible: no se ofrece |
| Fila de días anteriores | Hecho / Más tarde | **¿Se la dieron?** → **Sí, se la dieron** · **No se dio** | DOS-03. «Sí» pregunta la hora con la original preelegida: «¿A qué hora, más o menos?» |
| Toast al marcar | Listo, lo marcaste como hecho | **Losartán de María Elena: dada a las 08:00** · **Deshacer** (8 s) | DOS-02 |
| Toast «no se dio» | — | **Anotamos que no se dio el Losartán del martes** · **Deshacer** | — |
| Toast al pasar | Lo pasamos para dentro de una hora | **La pasamos a las 21:30** · **Deshacer** | — |
| Toast al deshacer | — | **Listo, quedó sin marcar** | — |
| Toast de error | No pudimos marcarlo. Probá de nuevo. (con check verde) | **No pudimos guardar la marca. Revisá la conexión y probá de nuevo.** (ícono de alerta, queda hasta cerrar) | DOS-05 |
| Calendario · diálogo | «Marcar como hecho» / «Va a dejar de figurar como pendiente. Esto no se puede deshacer desde la app.» | **Se elimina el diálogo**: mismo toque + toast con Deshacer que en Hoy | DOS-04 |
| Calendario · toast | Marcado como hecho | (igual que en Hoy) | — |
| Calendario · posponer | Lo pasamos para mañana | **La pasamos a mañana a las 08:00** · **Deshacer** | — |
| Calendario · leyenda | Hecho · Sin marcar · Se repite | **✓ Dada · ✕ No se dio · ○ Sin marcar · ↻ Se repite** | Símbolo + palabra (04 §estadoDosis) |
| Calendario · resumen | Adherencia 92 % | **Dosis dadas: 23 de 25** | Número exacto, sin jerga |
| Calendario · pendientes | Pendientes sin marcar / «Todo al día: no hay avisos vencidos sin marcar.» | **Quedó sin marcar** / «Todo marcado. No quedó nada sin marcar.» | — |
| Hoy vacío | Hoy no hay nada pendiente / Podés programar un turno, una vacuna o una dosis. | **Nada pendiente para hoy** / «Cuando programes una dosis o un turno, aparece acá.» · **Agregar** | Ilustración «aldia» |
| Hoy cargando | Cargando lo de hoy… | (skeleton; label «Cargando lo de hoy») | SIS-02: nunca «0» antes de tener datos |
| Notificación | (título genérico) | **Losartán 50 mg · María Elena** / «08:00 · Tocá para marcarla» | DOS-11 |

### 4.2 Emergencia (P0/P1 — EME-01..08)

| Dónde | Antes | Después | Notas |
|---|---|---|---|
| Navegación | (no existe) | **Emergencia** (4.º destino, D4) | — |
| Selector | — | **¿De quién es la ficha?** · caras con nombre | Un toque más y está la ficha |
| Sin conexión | (pantalla de error / onboarding) | **Sin conexión. Estás viendo la ficha guardada el sábado 28/11 a las 09:12.** | EME-01. Banner `aviso`, no `error`: la ficha sirve igual |
| Cabecera | María Elena Argento / Ficha de emergencia | **María Elena Argento** / «79 años · Ficha de emergencia» | EME-03 |
| Sección | Datos médicos | (desaparece: cada dato tiene su título) | EME-06 |
| Dato | Tipo de sangre | **Tipo de sangre** (también en la bienvenida, que decía «Grupo sanguíneo») | §3 |
| Sangre sin cargar | — | **Sin cargar** (gris) — nunca vacío | §2.11 |
| Alergias sin cargar | — | **Sin cargar** · y como opción explícita al editar: **No tiene alergias conocidas** | `TODO(backend)`: distinguir `null` de «ninguna». Hasta entonces sólo «Sin cargar» |
| Medicación | (sólo si alguien la escribió en Notas) | **Toma actualmente**: «Losartán 50 mg · todos los días 08:00» | EME-03, sale de los tratamientos activos |
| Notas | Notas médicas (vista) / Notas de emergencia (form) | **Para tener en cuenta** en los dos | Placeholder: «Marcapasos, diabetes, usa audífono…» (sin «medicación habitual»: ahora tiene su sección) |
| Contactos | Contactos de emergencia | **A quién llamar** | — |
| Contacto · botón | (ícono) · label «Llamar a Mónica Argento» | **Llamar** visible + label «Llamar a Mónica Argento, hija» | — |
| Contactos vacío | No hay contactos de emergencia cargados. | **Todavía no hay a quién llamar.** «Sumá al menos un teléfono para una emergencia.» · **Agregar contacto** | — |
| Modo edición | Editar (por dato) + lápiz y tacho por contacto | **Editar ficha** (uno solo) | EME-04 |
| Copiar | Copiar resumen / toast «Resumen copiado» | **Copiar la ficha** / «Ficha copiada. Pegala en un mensaje.» | — |
| Texto copiado · línea final | Generado con DOMUS+ | **Ficha de DOMUS+ · actualizada el 28/11/2026** | Al médico le importa la fecha |
| Ficha incompleta (Familia) | Ficha al 0 % | **Ficha sin completar** · botón **Completar ficha** | EME-08 |
| Después de crear a alguien | Integrante guardado | **Nélida ya está en tu familia** · **Completar su ficha** | EME-08 |
| Eliminar contacto | Eliminar contacto / ¿Seguro que querés eliminar a Rosa de los contactos de emergencia? | **¿Quitar a Rosa Benítez de la ficha?** / «Deja de aparecer en «A quién llamar».» · **Quitar a Rosa** | — |

### 4.3 Familia

| Dónde | Antes | Después | Notas |
|---|---|---|---|
| Título de pestaña (navegador) | Mi familia · DOMUS+ | **Familia · DOMUS+** | Igual al nombre del destino |
| Chips de la bandera | 3 dosis hoy · 0 turnos esta semana · 0 fichas incompletas | **2 dosis hoy · 1 turno esta semana · 1 ficha sin completar** (los ceros no se muestran) | DOS-06, FAM-02 |
| Tarjeta de integrante | 3 pendientes hoy | **2 dosis hoy** · o **1 quedó sin marcar** | — |
| Tarjeta · chip vacunas | Vacunas al día / Vacuna vencida | **Vacunas al día** / **Vacuna atrasada: Antirrábica** | «Vencida» suena a producto caducado |
| Tarjeta · alergias | Alergias: penicilina, maní, frutos secos… (truncado) | **Alérgica a 3 cosas** con tooltip/label con la lista | FAM-07 |
| Tarjeta · tipo | Adulto / Menor / Mayor | **38 años** (la edad dice más que la categoría) | El `tipo` sigue en el back |
| Tarjeta · botón | Emergencia | **Ficha** (completa) / **Completar ficha** (incompleta) | — |
| Menú agregar | Integrante con cuenta · Invitalo con un código / Perfil sin cuenta · Niño o adulto mayor | **Invitar a alguien** · «Con su propia cuenta» / **Persona sin cuenta** · «Un nene, un abuelo…» | FAM-08, género |
| Sidebar · invitar | Sumá a tu familia / Pasales el código para que se unan al grupo. / Copiar código | **Invitá a alguien** / «Con el código, se suma a tu familia y ve lo mismo que vos.» / **Copiar código** | Se oculta tras la primera invitación |
| Vacío | ¡Armemos tu familia! / Sumá a tu primer familiar o mascota para empezar a guardar vacunas, tratamientos y recordatorios. / Agregar un familiar · Agregar una mascota | **Empecemos por tu familia** / «Sumá a la primera persona o mascota que cuidás. Después vas a poder cargar sus vacunas, su medicación y su ficha de emergencia.» / **Agregar persona** · **Agregar mascota** | Sin «¡!» en las acciones |
| Eliminar integrante | Eliminar / ¿Seguro que querés eliminar a José Argento? Se perderá su historial de salud asociado. | **¿Eliminar a José Argento?** / «Se borran sus vacunas, tratamientos, historial y documentos. No se puede recuperar.» · **Eliminar a José** | Ver COP-01: hoy sus dosis y turnos **no** se borran |
| Esta semana | Esta semana | **Esta semana** · celdas con label «Jueves 3/12: 2 dosis, 1 turno» | — |

### 4.4 Calendario

| Dónde | Antes | Después | Notas |
|---|---|---|---|
| Botón | + Agregar | **Agregar** (ícono +, abre `AddMenu`) | CAL-06 |
| Botón del día | + Agregar para este día | **Agregar el jueves 3/12** | — |
| Día sin nada | Día libre | **Nada programado este día** | «Día libre» suena a feriado |
| Período sin nada | No hay recordatorios en este período. | **Nada programado este mes** / «Programá una dosis, un turno o una vacuna.» · **Agregar** | CAL-07 |
| Volver | Ir a hoy / Volver a hoy | **Hoy** (botón) · label «Ir a hoy» | Uno solo |
| Más acciones | Más acciones: exportar o imprimir | **Exportar o imprimir** | — |
| Toast exportar | Calendario exportado | **Listo, descargamos el calendario (.ics)** | — |
| Error exportar | No pudimos exportar el calendario. | **No pudimos armar el archivo del calendario. Probá de nuevo.** (tipo error) | — |
| Filtros | MA · MA · 🐾 🐾 🐾 | **Todos · María Elena · Mónica · Fatiga · Dardo…** | CAL-01 |
| Filtros (mobile) | (3 filas) | **Filtrar** · **Filtrar (2)** con filtros activos | CAL-04 |
| Eliminar repetido | Eliminar recordatorio repetido / Solo este · Este y los siguientes | **¿Qué dosis querés eliminar?** / **Sólo la del jueves 3/12** · **Esta y las siguientes (8)** · **Cancelar** | Contar cuántas se van |
| Eliminar uno | ¿Seguro que querés eliminar este recordatorio ("Si")? | **¿Eliminar el turno con la odontóloga?** / «Lo dejan de ver todos en la familia.» · **Eliminar turno** | — |
| Resumen | Turnos · Vacunas | **3 turnos · 1 vacuna** (con plural) | — |

### 4.5 Nuevo recordatorio y formularios de salud (DOS-08/09)

| Dónde | Antes | Después | Notas |
|---|---|---|---|
| Título | Recordatorio (pestaña) · «Nuevo recordatorio» | **Nueva dosis** / **Nuevo turno** / **Nueva vacuna** según el tipo | El tipo se elige antes, en `AddMenu` |
| Persona | ¿Para quién es? | **¿Para quién?** (preelegida si hay una sola o si viene de su ficha) | DOS-09 |
| Tipo | Tipo de recordatorio (arranca en «Control») | (se va: lo define `AddMenu`; si se entra directo, sin preelección) | DOS-09 |
| Medicación · título | Descripción (opcional) / Detalles del recordatorio… | **Medicamento** (obligatorio) · placeholder «Losartán» + **Dosis** (opcional) · «50 mg, 1 comprimido» | DOS-08 |
| Turno · título | Descripción (opcional) | **¿Con quién o dónde?** · «Dra. Paz, cardióloga» | — |
| Repetir | Repetir (opcional) / Cuántas veces en total / Ej. 10… | **¿Se repite?** · **No** · **Todos los días** · **Cada [n] días** · **Hasta** [fecha] | DOS-10 |
| Switch | Recordatorio activo | (se va de la interfaz: el estado lo dan las marcas) | Jerga |
| Fecha pasada | La fecha del recordatorio debe ser futura. | **Elegí una hora que todavía no pasó. Para anotar una dosis que ya se dio, marcala en Hoy.** | FRM-05; mismo texto en el back (`recordatoriosController.js:75, 182`) |
| Obligatorio (todos los forms) | Este campo es obligatorio | **Escribí el nombre** / **Elegí la fecha** / **Elegí la especie** (qué falta, con verbo) | 13 usos |
| Guardar | Guardar | **Guardar dosis** / **Guardar turno** / **Guardar vacuna** | — |
| Toast guardado | Recordatorio guardado | **Listo: Losartán, todos los días a las 08:00** | Repite lo importante para que se pueda chequear |
| Toast editar | Cambios guardados | **Cambios guardados** (se queda) | — |
| Vacuna · próxima | Próxima dosis (opcional) | **Próxima dosis** (opcional) · ayuda «Te avisamos unos días antes.» | — |
| Tratamiento | Descripción / Ej. Infección de oído · Medicación / Ej. Amoxicilina 250mg | **¿Para qué es?** / «Infección de oído» · **Medicamento** / «Amoxicilina 250 mg» | Espacio antes de la unidad |
| Fechas (`dateRules.js`) | La fecha de nacimiento no puede ser futura. | **La fecha de nacimiento no puede ser después de hoy.** | Igual para aplicación; «anterior a 1900» → «Revisá el año: es anterior a 1900.» |
| Fin de tratamiento | La fecha de fin no puede ser anterior a la fecha de inicio. | **Tiene que terminar después de empezar. Revisá la fecha de fin.** | — |
| Eliminar vacuna/tratamiento | ¿Seguro que querés eliminar esta vacuna? No se puede deshacer. | **¿Eliminar la vacuna Antirrábica del 12/03/2026?** / «También se borran sus documentos.» · **Eliminar vacuna** | Cascade de adjuntos: sí (`schema.prisma:310`) |
| Cambios sin guardar | (hook `useUnsavedChangesGuard`) | **¿Salir sin guardar?** / «Se pierde lo que escribiste.» · **Salir sin guardar** · **Seguir editando** | — |

### 4.6 Cuenta

| Dónde | Antes | Después | Notas |
|---|---|---|---|
| Título | Mi cuenta / Administrá tus datos personales y tu grupo familiar. | **Cuenta** / «Tus datos, tu familia y cómo se ve la app.» | — |
| Grupo · contador | Grupo familiar · 2 integrantes | **Familia Argento · 2 personas con acceso** | CTA-02 |
| Rol propio | Sos el dueño del grupo | **Creaste este grupo** | Género (§2.2) |
| Rol en lista | Dueño / Miembro | **Creó el grupo** · **Coordina** · **Puede editar** | D3 |
| Invitar | Invitar miembro / Generá un código para que se una a tu grupo | **Invitar a alguien** / «Generá un código y pasáselo. Con eso crea su cuenta y se suma.» | — |
| Código | Sigue activo hasta que generes otro código. | **Sirve hasta que generes uno nuevo.** | — |
| Quitar miembro | Eliminar miembro / ¿Seguro que querés eliminar a Paola Argento del grupo familiar? | **¿Quitar a Paola Argento del grupo?** / «Deja de ver la familia. Lo que cargó se queda.» · **Quitar a Paola** | Al quitar a alguien, lo que cargó se queda (no se borra el usuario). Si elimina su cuenta, hoy no: **ver COP-02** |
| Salir del grupo | ¿Seguro que querés salir de este grupo familiar? Vas a dejar de ver sus integrantes, mascotas y recordatorios. / Salir | **¿Salir de Familia Argento?** / «Dejás de ver sus fichas y su calendario. Para volver, te tienen que invitar de nuevo.» · **Salir del grupo** | — |
| Cerrar sesión | ¿Seguro que querés cerrar sesión? | **¿Cerrar sesión en este dispositivo?** / «Tus datos quedan guardados.» · **Cerrar sesión** | Mismo texto en `SideBar.js:240`, `AccountScreen.js:198` y `GroupSetupScreen.js:78` |
| Zona de peligro | Zona de peligro | **Tu cuenta** | No asusta: dice qué hay |
| Exportar | Exportar mis datos / Un archivo de texto con tu perfil y las fichas del grupo. / toast «Tus datos están listos» | **Descargar mis datos** / igual / «Listo, descargamos tus datos» | — |
| Eliminar cuenta | Tu cuenta se borra para siempre. Si sos la única persona del grupo, también se borran sus integrantes, mascotas, fichas y recordatorios. | **¿Eliminar tu cuenta?** / «Se borra para siempre. Si sos la única persona con acceso, también se borra toda la familia: integrantes, mascotas, fichas y calendario.» · **Eliminar mi cuenta** | — |
| Error back | Sos el dueño del grupo y todavía hay otros miembros. Quitalos o eliminá el grupo antes de eliminar tu cuenta. | **Antes de eliminar tu cuenta, pasale la coordinación a otra persona o quitá a las demás del grupo.** | `authController.js:193`. «Pasar la coordinación» depende de CTA-07; hasta entonces: «quitá a las demás personas del grupo» |
| Preferencias | Recordatorios anticipados / Recibir aviso antes de cada dosis o turno (en el celular). | **Avisarme antes** / «Un aviso antes de cada dosis o turno. Sólo en el celular.» | — |
| Contraste (nuevo, D2) | — | **Contraste alto** / «Colores más marcados y bordes más gruesos.» | — |
| Mi ficha sin integrante | Todavía no estás cargado en Familia. Sumate como integrante para tener tu ficha. | **Todavía no tenés ficha.** / «Sumate a Familia como integrante y la armamos.» · **Sumarme** | Género |

### 4.7 Entrada, registro y grupo

| Dónde | Antes | Después | Notas |
|---|---|---|---|
| Bienvenida · paso 3 | Todos reciben los avisos / Cada recordatorio le llega a toda la familia, sin que nadie se olvide. | **Todos ven lo mismo** / «Lo que carga uno lo ve toda la familia. Los avisos llegan a cada celular con la app.» | **COP-03**: las notificaciones son locales (`notifications.js:101`), no llegan en web ni a quien no abrió la app |
| Bienvenida · ficha | Alergias, grupo sanguíneo y contactos en un toque. / Grupo O+ · Alérgico a penicilina | «Alergias, tipo de sangre y a quién llamar, en un toque.» / **O+ · Alergia a penicilina** | §3; sin género |
| Bienvenida · garantía | Letra grande y clara | **Letra grande, si la necesitás** | Es una preferencia, no el default |
| Login · error | Ese correo o contraseña no coinciden. Fijate si tenés las mayúsculas activadas. | **El correo o la contraseña no coinciden. Fijate si están activadas las mayúsculas.** | «Ese… no coinciden» no concuerda |
| Login · vacíos | Email y contraseña son obligatorios. | **Escribí tu correo y tu contraseña.** | `authController.js:107` |
| Registro · contraseña | La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número. | **La contraseña necesita 8 caracteres o más, una mayúscula y un número.** + lista ✓/○ «Cumple»/«Falta» | FRM-01 |
| Registro · correo usado | Ese correo ya tiene una cuenta. Probá iniciar sesión. | (queda) + enlace **Iniciar sesión** | Ya es bueno |
| Perfil · correo usado | El email ya está registrado. | **Ese correo ya lo usa otra cuenta.** | `authController.js:253`, unificar |
| Contraseña · iguales | La nueva contraseña debe ser diferente a la actual. | **Elegí una contraseña distinta de la actual.** | — |
| Contraseña · éxito | Contraseña actualizada. | **Listo, cambiaste la contraseña** | — |
| Grupo · error | Debe pertenecer a un grupo familiar primero. | **Primero creá tu familia o sumate a una con un código.** | `recordatoriosController.js:81` |
| Back · 500 | Error interno del servidor. | (no se muestra: `client.js:72` ya lo reemplaza por «Algo salió mal de nuestro lado. Probá de nuevo en un momento.») | Bien resuelto |
| Back · campos con nombre técnico | tipo y fecha_hora son obligatorios. / …indicá cada cuántos días (repetir_cada_dias). | **Elegí el tipo, la fecha y la hora.** / **Indicá cada cuántos días se repite.** | Nunca nombres de campos de la API |
| Back · no encontrado | Recordatorio no encontrado. | **No encontramos esa dosis. Puede que alguien la haya eliminado.** + recargar la lista | Pasa con dos personas editando |
| Red | No pudimos conectarnos. Revisá tu conexión a internet y probá de nuevo. | **No hay conexión. Revisá internet y probá de nuevo.** | `client.js:70` |
| 404 web | No encontramos esa página / Volver al inicio | (queda) | — |

---

## 5. Patrones (plantillas)

### Toast

```
[Qué] de [quién]: [resultado]          Losartán de María Elena: dada a las 08:00   · Deshacer
[Resultado corto]                      Cambios guardados
No pudimos [verbo]. [Qué hacer].       No pudimos guardar la marca. Revisá la conexión y probá de nuevo.   · Cerrar
```
- Éxito: hasta 8 palabras. Con «Deshacer» cuando la acción se puede revertir (marcas, pasar de hora, quitar de un filtro).
- Error: `mostrarToast(texto, 'error')` **siempre** en un `catch` (DOS-05). Si el error vino del back con un 4xx, se usa su
  texto (por eso los textos del back también siguen esta guía).
- Nunca un toast para algo que la pantalla ya muestra (por ejemplo, después de guardar y volver a la ficha, el dato nuevo
  ya está a la vista: el toast puede faltar).

### Confirmación (`confirmarDestructivo`)

```
Título:  ¿[Verbo] [objeto concreto]?               ¿Eliminar a José Argento?
Cuerpo:  [Qué se pierde]. [Si se puede recuperar].  Se borran sus vacunas, tratamientos, historial y documentos. No se puede recuperar.
Botón:   [Verbo] [objeto corto]                     Eliminar a José
Otro:    Cancelar
```
- Sólo para lo que **no** tiene Deshacer. Si se puede ofrecer Deshacer, no se confirma (DOS-04).
- Hoy `confirmarDestructivo(titulo, mensaje, onConfirmar, textoConfirmar = 'Eliminar')`: pasar siempre `textoConfirmar`.

### Error en un campo

```
[Verbo en imperativo] [lo que falta o cómo corregirlo].     Escribí el nombre. · Elegí una hora que todavía no pasó.
```
- Debajo del campo, con ícono (no sólo color, WCAG 1.4.1). El foco va al primer campo con error (`useFirstErrorFocus`, ya existe).

### Error de carga (`InlineError`)

```
No pudimos cargar [qué].   [Reintentar]          No pudimos cargar el calendario.   Reintentar
```
Ya se usa así; sólo cambia «los recordatorios» → «el calendario» y «el seguimiento médico» → «las vacunas y tratamientos».

### Vacío (`EmptyState`)

```
Título:  [Qué va acá, en positivo]                     Todavía no hay a quién llamar
Texto:   [Para qué sirve / qué pasa cuando haya]        Sumá al menos un teléfono para una emergencia.
Acción:  [Verbo + cosa]                                  Agregar contacto
```

| Vacío | Título | Texto | Acción |
|---|---|---|---|
| Familia | Empecemos por tu familia | Sumá a la primera persona o mascota que cuidás. Después vas a poder cargar sus vacunas, su medicación y su ficha de emergencia. | Agregar persona · Agregar mascota |
| Hoy | Nada pendiente para hoy | Cuando programes una dosis o un turno, aparece acá. | Agregar |
| Calendario (mes) | Nada programado este mes | Programá una dosis, un turno o una vacuna. | Agregar |
| Vacunas de alguien | Todavía no hay vacunas | Cargá las que ya se aplicó y te avisamos de las próximas. | Agregar vacuna |
| Tratamientos | Sin tratamientos cargados | Si toma algo todos los días, cargalo y aparece en su ficha de emergencia. | Agregar tratamiento |
| Historial | El historial está vacío | Acá quedan los turnos, estudios y consultas que pasaron. | — |
| Documentos | Sin documentos | Sacale una foto a una receta o subí un PDF. | Adjuntar |
| Contactos | Todavía no hay a quién llamar | Sumá al menos un teléfono para una emergencia. | Agregar contacto |
| Mascotas | Sin mascotas | Si en casa hay un perro o un gato, sumalo para no perderle el rastro a sus vacunas. | Agregar mascota |

---

## 6. Accesibilidad del texto

- Cada botón de ícono lleva `accessibilityLabel` con **verbo + objeto + de quién**: «Marcar como dada: Losartán, María Elena».
  Hoy la mayoría ya lo hace (`FamiliaHoy.js:151`, `EmergencyScreen.js:374`).
- El label **empieza con el texto visible** (WCAG 2.5.3): si el botón dice «Dada», el label empieza por «Dada…» o «Marcar como dada…»,
  no por «Confirmar toma».
- Los toasts de éxito se anuncian `polite`; los de error `assertive` (ya en `ToastHost.js:43`).
- Los estados de dosis nunca dependen del color: símbolo + palabra (§4.1, leyenda).
- `aria-label` del menú de usuario: «Menú de Mónica Argento, Dueño» (`SideBar.js:254`) → **«Menú de tu cuenta: Mónica Argento»** (el rol no hace falta ahí).
- Siglas que el lector deletrea mal: escribir «PDF» (no «pdf»), «O positivo» en el label del tipo de sangre («O+» se lee «O más»).

---

## 7. Hallazgos nuevos de esta fase

| ID | Problema | Evidencia | Sev. | Propuesta |
|---|---|---|---|---|
| **COP-01** | Al eliminar un integrante, sus dosis y turnos **no se borran**: quedan en el calendario sin persona (`onDelete: SetNull`). La confirmación actual («Se perderá su historial de salud asociado») no lo avisa, y el nuevo texto no puede prometer que se borran | `schema.prisma:282-283` | P1 | Fase 6: en `eliminarIntegrante`/`eliminarMascota`, borrar también sus recordatorios (`deleteMany` con `grupoId`) y decirlo en la confirmación: «Se borran sus vacunas, tratamientos, historial, documentos y lo que tenía programado» |
| **COP-02** | Si una persona con acceso **elimina su cuenta**, se borran todos los recordatorios que cargó (`creadoPor` con `onDelete: Cascade`), aunque la familia siga: si fue Martín quien cargó el Losartán de la abuela, desaparece para todos. Quitarla del grupo no borra nada (el usuario sigue existiendo) | `schema.prisma:279` | P1 | Fase 6: `creadoPor` opcional con `SetNull` (migración chica). Así «Lo que cargó se queda» es cierto en los dos casos |
| **COP-03** | La bienvenida promete «Cada recordatorio le llega a toda la familia». Las notificaciones son **locales**: no llegan en web ni a quien no abrió la app en su celular | `utils/notifications.js:101` | P2 | Texto de §4.7. La promesa vuelve cuando haya push (`TODO(backend)`, fuera de alcance) |
| **COP-04** | Mensajes del back con nombres de campos de la API («`tipo y fecha_hora son obligatorios`», «`(repetir_cada_dias)`») que `client.js` muestra tal cual | `recordatoriosController.js:65, 69, 176` | P2 | Textos de §4.7. Los formularios ya validan antes, así que sólo se ven si falla esa validación |
| **COP-05** | La misma acción con tres textos: «Cerrar sesión» confirma con «¿Seguro que querés cerrar sesión?» en dos lugares y con otro texto en `GroupSetupScreen` | `SideBar.js:240`, `AccountScreen.js:198`, `GroupSetupScreen.js:78` | P2 | Un texto (§4.6) en una constante compartida |

---

## 8. Cómo se aplica en la Fase 6

- **Los textos quedan en cada pantalla** (no se arma un archivo de traducciones: la app es sólo en español y un sistema de i18n
  sería sobre-ingeniería para el MVP). Excepción: los que se repiten en 3 o más lugares van a `src/utils/textos.js`
  (cerrar sesión, error de red, «Escribí…/Elegí…» de obligatorios, plantillas de toast de dosis).
- Los textos del back (`authController`, `recordatoriosController`) se cambian en el mismo commit que la pantalla que los muestra.
- Orden: §4.1 y §4.2 con los P0; §4.3–4.6 con cada pantalla; §4.7 al final (P2), salvo FRM-01 (P1).
- Revisión rápida antes de cada commit: `grep -rn "¿Seguro\|Este campo es obligatorio\|+ Agregar\|recordatorio" src/` y
  revisar que cada aparición tenga su razón.

## 9. Para decidir

Nada bloqueante. Una sola cosa queda a criterio del equipo:

- **«Dada» o «Tomada»** para la marca de dosis. Elegí **«Dada»** porque la mayoría de las dosis las marca quien cuida (Mónica,
  Héctor), no quien toma. Si en las pruebas con usuarios aparece que la abuela marca las suyas, se puede mostrar «Tomada» cuando
  la persona con acceso es la misma integrante (`TODO(backend)` FAM-01: `Integrante.usuarioId`).
