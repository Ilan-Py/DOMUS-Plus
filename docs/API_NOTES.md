# DOMUS+ — Notas de API y contratos con el backend

Backend tratado como read-only desde el frontend salvo indicación
explícita. Todo esto viene de auditar `backend/src/controllers/*.js`
directamente, no de documentación externa.

## Envelope de respuesta

Todos los endpoints devuelven `{ codigo, estado, datos }`, incluso los
errores (el mensaje legible en español va en `datos` cuando
`estado === 'error'`). El interceptor de response en
`frontend/src/api/client.js` es el ÚNICO lugar donde esta forma debe
aparecer — ninguna pantalla debería ver el envelope crudo.

## Landmines conocidos

1. **Casing de enums**: la UI muestra labels capitalizados
   (`'Adulto'`, `'Menor'`, `'Mayor'`) pero la columna MySQL es
   `ENUM('adulto','menor','mayor')` en minúsculas. Mismo patrón para
   el `tipo` de recordatorios (`vacuna`/`control`/`medicacion`). El
   mapeo a minúsculas debe pasar solo al armar el payload, nunca en
   la UI.

2. **JWT expira devolviendo 403, no 401**: `verificarToken` devuelve
   403 para un token vencido. El interceptor de `client.js` trata
   ambos códigos como sesión expirada — si se toca ese interceptor,
   no asumir que solo 401 importa.

3. **Owner key exclusivo en `/api/salud/*`**: los POST de vacunas y
   tratamientos rechazan con 400 si el body trae `integrante_id` Y
   `mascota_id` a la vez. Mandar exactamente una de las dos claves
   según el `tipo` del owner.

4. **Sin endpoint de salud a nivel grupo**: `/api/salud/vacunas` y
   `/api/salud/tratamientos` requieren `integrante_id` o `mascota_id`
   como query param — devuelven 400 sin él. No existe una ruta "todo
   el historial de salud del grupo". Por eso el calendario se arma
   solo con `GET /api/recordatorios` (que sí es user-scoped, sin
   params), no con datos de salud.

5. **`PATCH /api/recordatorios/:id/desactivar` devuelve un string
   plano** en `datos`, no un objeto — no desestructurar la respuesta.

6. **IDOR sin resolver en `saludController`** (flag para el dueño del
   backend, no se resuelve desde el frontend): a diferencia de
   `familiaController`, que valida el grupo vía join,
   `saludController` no verifica que el `integrante_id`/`mascota_id`
   recibido pertenezca al grupo del usuario autenticado. Cualquier
   usuario logueado puede leer/escribir historial de otra familia
   cambiando el id. Pendiente de arreglo en el backend antes de
   cualquier entrega o demo pública.

7. **`agregarIntegrante` requiere `nombre` y `apellido` separados**,
   no un nombre completo — a diferencia de lo que el formulario
   original asumía. Ya corregido en `AddMemberScreen` (dos campos
   reales, no un split heurístico).

8. **`registrar` no devuelve token** — después de registrar hay que
   llamar a `login()` con las mismas credenciales para obtener sesión.

9. **`fecha_hora` de recordatorios debe ser estrictamente futura** y
   tener formato `'YYYY-MM-DD HH:mm:ss'` (formato DATETIME de MySQL,
   no ISO con `T`). El backend no valida que `fecha_fin` sea posterior
   a `fecha_inicio` en tratamientos — esa validación es responsabilidad
   exclusiva del cliente.

## Formateo de fechas — cuidado con UTC

`toISOString()` convierte a UTC y puede correr la fecha un día según
el huso horario del dispositivo. Todo el formateo de fecha/hora pasa
por dos helpers centralizados
(`formatDateOnly`/`formatTimeOnly` en `DatePickerField.js`) que usan
getters locales (`getFullYear`, `getMonth`, etc.), nunca
`toISOString()`. Si se toca el formateo de fechas en cualquier
pantalla, reusar esos helpers en vez de reimplementar.
