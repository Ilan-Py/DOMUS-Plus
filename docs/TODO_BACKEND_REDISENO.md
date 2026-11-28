# TODO(backend) — rediseño papercut (Familia, Calendario, Mi cuenta)

Cosas que el rediseño pide y el backend todavía no soporta. La interfaz no las inventa: quedan sin mostrar o con una
alternativa, y se enganchan cuando exista el dato.

## Familia
- Stock bajo de medicación y receta por renovar (alertas proactivas): no hay stock ni recetas en el modelo.
- Veterinario y próxima desparasitación en las tarjetas de mascota: no existe el dato (sólo `ProfesionalSalud`, sin
  vínculo a "veterinario de cabecera" ni fecha de desparasitación).
- Completitud de ficha: se calcula con tipo de sangre, alergias y notas; los contactos de emergencia no vienen en el
  listado de integrantes (habría que sumar un conteo al `select`).

## Calendario
- Estado "omitido" en una dosis: hoy sólo existe `activo` (hecho / pendiente). El ✕ de la grilla significa "venció sin
  marcar". Hace falta un estado `omitido` (y quizá `tomado_a` con la hora real).
- Editar "solo este / toda la serie": el backend edita una repetición a la vez; sólo borrar admite `alcance=siguientes`.
- Hora opcional ("Todo el día"): `fecha_hora` es siempre un instante.
- Sincronizar con Google Calendar: se reemplazó por exportar `.ics`. Una sincronización real necesita OAuth y un job.

## Mi cuenta
- Foto de avatar subida por la persona, teléfono y fecha de nacimiento del usuario: `Usuario` no tiene esos campos.
- Ficha de emergencia: fecha de última actualización (no hay `updated_at` en `Integrante`) y QR de acceso de emergencia.
  Se dejaron afuera a pedido del equipo en la ronda anterior.
- Vencimiento del código de invitación: hoy el código sigue activo hasta que se genera otro. Falta `expira_en`.
- Invitaciones pendientes (lista, reenviar, cancelar).
- Roles extra (Admin, Cuidador de sólo lectura): hoy sólo `dueno | miembro`.
- Permisos por integrante (quién ve qué ficha) y registro de actividad del grupo visible para el dueño (hoy el registro
  es sólo para el admin del sistema).
- Cambiar email, sesiones activas / dispositivos, 2FA.
- Preferencias guardadas en la cuenta: tema claro/oscuro/alto contraste, horario silencioso y canales (push/email); hoy
  las preferencias viven en el dispositivo. QR o enlace para vincular la app móvil.
