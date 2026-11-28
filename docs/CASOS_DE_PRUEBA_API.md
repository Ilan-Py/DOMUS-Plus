# DOMUS+ — Casos de prueba de la API (para los tests de Postman)

Guía para agregar verificaciones (`pm.test`) a `docs/DOMUS+ API.postman_collection.json`. Los códigos y mensajes de este archivo salen de correr cada caso contra el backend con el seed (26/11/2026).

## Cómo correr la colección

1. Base desde cero: `docker compose down -v`, `docker compose up -d --build` y `docker compose exec backend npx prisma db seed`.
2. **Postman:** importar la colección y usar *Run collection*. `base_url` ya apunta a `http://localhost:3000`.
3. **Newman** (terminal), sin la carpeta 13, que necesita elegir un archivo a mano:

```
npx newman run "docs/DOMUS+ API.postman_collection.json" \
  --folder "0. Preparación (sesiones del seed)" \
  --folder "1. Cuenta (usuario nuevo)" \
  --folder "2. Grupo familiar" \
  --folder "3. Integrantes" \
  --folder "4. Mascotas" \
  --folder "5. Contactos de emergencia" \
  --folder "6. Vacunas" \
  --folder "7. Tratamientos e historial" \
  --folder "8. Profesionales de salud" \
  --folder "9. Recordatorios" \
  --folder "10. Adjuntos" \
  --folder "11. Administrador" \
  --folder "12. Limpieza (borra lo creado)" \
  -r cli,htmlextra --reporter-htmlextra-export informe-pruebas.html
```

El reporte HTML necesita `npm i -g newman-reporter-htmlextra` (o `npx -p newman -p newman-reporter-htmlextra newman run ...`). Sin él, usar `-r cli`.

La colección se puede correr varias veces seguidas sin resetear la base: crea un usuario nuevo con email distinto cada vez y la carpeta 12 borra lo que crea. Hoy, sin verificaciones, todos los pedidos de las carpetas 0 a 12 responden 2xx.

## Usuarios y tokens

La carpeta 0 inicia sesión y guarda los tokens en variables de la colección. Contraseña de todos: `Admin123`.

| Variable | Usuario | Para qué sirve en las pruebas |
|---|---|---|
| `token` | Mónica (`monica@domus.test`), dueña de la Familia Argento | Token por defecto de la colección |
| `token_jose` | José (`jose@domus.test`), miembro de la Familia Argento | Casos de permisos: un miembro no puede hacer lo del dueño (403) |
| `token_paola` | Paola (`paola@domus.test`), sin grupo | Unirse con código, usuario sin grupo |
| `token_pablo` | Pablo (`pablo@domus.test`), Familia Herrera | Casos entre familias: no ve ni toca datos de los Argento (404) |
| `token_admin` | Admin (`admin@domus.test`) | Panel del administrador |
| `token_nuevo` | Usuario creado en la carpeta 1 | Cambios de perfil, contraseña y grupo sin tocar el seed |

Para los casos entre familias hacen falta ids de la otra familia. Se pueden sacar con Pablo (`GET /familia/integrantes` con `token_pablo`) y guardarlos en variables. En el seed, Lucas es el único integrante de los Herrera y Mora su gata.

## Qué verificar en todos los pedidos

Toda respuesta tiene el formato `{ "codigo": <número>, "estado": "ok" | "error", "datos": ... }`, y `codigo` es igual al status HTTP. Una base para cada test:

```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Formato de la API', () => {
  const res = pm.response.json();
  pm.expect(res).to.have.all.keys('codigo', 'estado', 'datos');
  pm.expect(res.codigo).to.eql(pm.response.code);
});
```

En los casos de error, comparar también `datos`, que trae el mensaje para el usuario:

```js
pm.test('Rechaza el nombre con números', () => {
  pm.response.to.have.status(400);
  pm.expect(pm.response.json().datos).to.include('sólo puede tener letras');
});
```

## Pedidos que ya están en la colección (casos positivos)

| Carpeta | Verificar |
|---|---|
| 0. Preparación | Status 200, `datos.token` y `datos.usuario.rol` (`usuario` o `admin`). |
| 1. Cuenta | Registro 201 con `id`, `nombre`, `apellido`, `email` (sin password ni token). Perfil y contraseña 200. |
| 2. Grupo | Crear 201. Invitación 200 con `codigo_invitacion` de 7 caracteres. Unirse 201. Miembros: Mónica figura con `rol: "dueño"`. |
| 3. Integrantes | Alta 201 con `tipo: "adulto"` calculado (no se manda). Ficha de emergencia: `tipo_sangre: "A+"` y alergias guardadas como `Penicilina, Maní`. |
| 4. Mascotas | Alta 201 con `especie` tal como se mandó (`Hámster`). |
| 5. a 8. | Altas 201 con `id`; listados 200 con un array que contiene lo creado; ediciones 200. Profesional: `especialidad` normalizada a `Cardiología`. |
| 9. Recordatorios | Periódico: 201 con `cantidad: 4` y `serie_id`. Desactivar: `datos` es texto. Borrar serie: 200 con `eliminados: 4`. |
| 11. Administrador | Estadísticas 200 con las claves `usuarios`, `grupos`, `integrantes`, `mascotas`, `adjuntos`, `actividad`; `acciones_por_dia` con 7 elementos (30 con `dias=30`). Que **no** aparezcan nombres de integrantes ni datos médicos. Identificar: 200 con `email`. |
| 12. Limpieza | Todos 200. |

## Casos negativos para agregar

Ninguno está en la colección todavía. Conviene una carpeta por grupo (por ejemplo, «14. Validaciones», «15. Permisos», «16. Entre familias») después de la 12, para que no dependan de los ids que se borran en la limpieza.

### Cuenta

| Caso | Pedido | Token | Detalle | Esperado | `datos` |
|---|---|---|---|---|---|
| Registro sin campos | `POST /auth/registrar` | — | `{}` | **400** | Todos los campos son obligatorios: nombre, apellido, email y password. |
| Registro email existente en mayúsculas | `POST /auth/registrar` | — | email `MONICA@DOMUS.TEST` | **409** | El email ya está registrado. |
| Registro nombre con números | `POST /auth/registrar` | — | nombre `Ro12` | **400** | El campo nombre sólo puede tener letras, espacios, apóstrofes y guiones. |
| Registro email inválido | `POST /auth/registrar` | — | email `no-es-email` | **400** | El email no tiene un formato válido. |
| Registro contraseña débil | `POST /auth/registrar` | — | password `abc` | **400** | La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número. |
| Registro nombre como número | `POST /auth/registrar` | — | nombre `123` (número, no texto) | **400** | El campo nombre debe ser texto. |
| Login contraseña incorrecta | `POST /auth/login` | — | Mónica con otra contraseña | **401** | Credenciales incorrectas. |
| Login email inexistente | `POST /auth/login` | — | `nadie@domus.test` | **401** | Credenciales incorrectas. |
| JSON mal formado | `POST /auth/login` | — | cuerpo `{"email":` (cortado) | **400** | El cuerpo de la solicitud no es un JSON válido. |
| Perfil con email de otra cuenta | `PATCH /auth/perfil` | Mónica | email `jose@domus.test` | **409** | El email ya está registrado. |
| Perfil sin email | `PATCH /auth/perfil` | Mónica | sólo nombre y apellido | **400** | Todos los campos son obligatorios: nombre, apellido y email. |
| Contraseña actual incorrecta | `PATCH /auth/password` | Mónica | `passwordActual` equivocada | **401** | La contraseña actual es incorrecta. |
| Contraseña nueva débil | `PATCH /auth/password` | Mónica | `passwordNueva` = `corta` | **400** | La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número. |

### Sesión

| Caso | Pedido | Token | Detalle | Esperado | `datos` |
|---|---|---|---|---|---|
| Sin token | `GET /familia/integrantes` | ninguno | sin header Authorization | **401** | Token no proporcionado. |
| Token inválido | `GET /familia/integrantes` | `abc.def.ghi` |  | **401** | Token inválido o expirado. |
| Ruta inexistente | `GET /no-existe` | Mónica |  | **404** | Ruta no encontrada. |

### Grupo y roles

| Caso | Pedido | Token | Detalle | Esperado | `datos` |
|---|---|---|---|---|---|
| Crear grupo teniendo uno | `POST /familia/grupo` | Mónica |  | **409** | Ya pertenecés a un grupo familiar. |
| Miembro genera invitación | `POST /familia/grupo/invitacion` | José |  | **403** | Sólo el dueño del grupo puede generar un código de invitación. |
| Miembro renombra grupo | `PATCH /familia/grupo` | José |  | **403** | Sólo el dueño del grupo puede renombrarlo. |
| Miembro quita a otro | `DELETE /familia/grupo/miembros/4` | José | 4 = Mónica | **403** | Sólo el dueño del grupo puede eliminar miembros. |
| Miembro elimina grupo | `DELETE /familia/grupo` | José |  | **403** | Sólo el dueño puede eliminar el grupo familiar. |
| Dueña intenta salir | `POST /familia/grupo/salir` | Mónica |  | **400** | El dueño no puede salir del grupo. Por ahora sólo podés eliminar el grupo completo. |
| Unirse con código inexistente | `POST /familia/grupo/unirse` | Paola | código `ZZZZZZ` | **404** | Código de invitación inválido. |
| Unirse teniendo grupo | `POST /familia/grupo/unirse` | José |  | **409** | Ya pertenecés a un grupo familiar. Salí del actual antes de unirte a otro. |

### Integrantes

| Caso | Pedido | Token | Detalle | Esperado | `datos` |
|---|---|---|---|---|---|
| Integrante nombre con números | `POST /familia/integrantes` | Mónica | nombre `Ro12` | **400** | El campo nombre sólo puede tener letras, espacios, apóstrofes y guiones. |
| Integrante fecha futura | `POST /familia/integrantes` | Mónica | fecha `2030-01-01` | **400** | La fecha de nacimiento no puede ser una fecha futura. |
| Integrante fecha inexistente | `POST /familia/integrantes` | Mónica | fecha `2026-02-31` | **400** | El campo fecha de nacimiento no es una fecha válida (formato AAAA-MM-DD). |
| Integrante sin apellido | `POST /familia/integrantes` | Mónica |  | **400** | nombre, apellido y fecha_nacimiento son obligatorios. |
| Integrante observaciones >2000 | `POST /familia/integrantes` | Mónica | 2001 caracteres | **400** | El campo observaciones admite como máximo 2000 caracteres. |
| Id de URL no numérico | `DELETE /familia/integrantes/abc` | Mónica |  | **400** | El id de la URL debe ser un número entero positivo. |
| Id de URL enorme | `DELETE /familia/integrantes/99999999999` | Mónica |  | **400** | El id de la URL debe ser un número entero positivo. |
| Tipo de sangre inválido | `PATCH /familia/integrantes/{Alfio}/emergencia` | Mónica | tipo_sangre `Z+` | **400** | El campo tipo de sangre debe ser uno de: A+, A-, B+, B-, AB+, AB-, O+, O-. |
| Tipo de sangre «0 negativo» (se normaliza) | `PATCH /familia/integrantes/{Alfio}/emergencia` | Mónica | `0 negativo` y alergias `mani, picadura de abeja` → se guardan `O-` y `Maní, Picadura de abeja` | **200** | {"id":7,"alergias":"Maní, Picadura de abeja","tipo_sangre":"O-","notas_emergencia":null} |

### Mascotas

| Caso | Pedido | Token | Detalle | Esperado | `datos` |
|---|---|---|---|---|---|
| Mascota especie «Otro» sola | `POST /familia/mascotas` | Mónica | especie `Otro` | **400** | Si la especie es "Otro", escribí cuál es (por ejemplo, Conejo). |
| Mascota especie con números | `POST /familia/mascotas` | Mónica | especie `Pez1` | **400** | El campo especie sólo puede tener letras, espacios, apóstrofes y guiones. |
| Mascota especie «perro» (se normaliza) | `POST /familia/mascotas` | Mónica | especie `perro` → se guarda `Perro` | **201** | objeto guardado |

### Contactos

| Caso | Pedido | Token | Detalle | Esperado | `datos` |
|---|---|---|---|---|---|
| Contacto teléfono con letras | `POST /familia/integrantes/{Alfio}/contactos-emergencia` | Mónica | teléfono `llamar al celu` | **400** | El campo teléfono sólo puede tener números, espacios, guiones, paréntesis y un + al principio. |
| Contacto nombre con números | `POST /familia/integrantes/{Alfio}/contactos-emergencia` | Mónica | nombre `Ana 2` | **400** | El campo nombre sólo puede tener letras, espacios, apóstrofes y guiones. |
| Contacto número corto 107 (válido) | `POST /familia/integrantes/{Alfio}/contactos-emergencia` | Mónica | teléfono `107` | **201** | {"id":6,"nombre":"Emergencias","telefono":"107","relacion":"Servicio"} |

### Salud

| Caso | Pedido | Token | Detalle | Esperado | `datos` |
|---|---|---|---|---|---|
| Vacuna sin integrante ni mascota | `POST /salud/vacunas` | Mónica |  | **400** | Debe indicar integrante_id o mascota_id. |
| Vacuna con los dos | `POST /salud/vacunas` | Mónica | integrante_id y mascota_id | **400** | Solo puede indicarse integrante_id o mascota_id, no ambos. |
| Vacuna próxima dosis anterior | `POST /salud/vacunas` | Mónica | próxima dosis antes de la aplicación | **400** | La fecha de próxima dosis debe ser posterior a la fecha de aplicación. |
| Tratamiento fecha fin anterior | `POST /salud/tratamientos` | Mónica | fecha_fin antes de fecha_inicio | **400** | La fecha de fin no puede ser anterior a la fecha de inicio. |
| Historial sin integrante ni mascota | `GET /salud/historial` | Mónica | sin query | **400** | Debe indicar integrante_id o mascota_id. |

### Recordatorios

| Caso | Pedido | Token | Detalle | Esperado | `datos` |
|---|---|---|---|---|---|
| Recordatorio tipo inválido | `POST /recordatorios` | Mónica | tipo `cumple` | **400** | tipo debe ser uno de: vacuna, control, medicacion. |
| Recordatorio fecha inválida | `POST /recordatorios` | Mónica | fecha_hora `2027-02-31 10:00` | **400** | El campo fecha y hora no es una fecha y hora válida. |
| Repetir cada 0 días | `POST /recordatorios` | Mónica | `repetir_cada_dias: 0` | **400** | El campo repetir cada (días) debe ser un número entero entre 1 y 365. |
| Repetir 1 vez | `POST /recordatorios` | Mónica | `repetir_veces: 1` | **400** | El campo cantidad de veces debe ser un número entero entre 2 y 100. |
| Borrar con alcance inválido | `DELETE /recordatorios/{id}?alcance=todos` | Mónica |  | **400** | alcance debe ser uno de: este, siguientes. |

### Administrador

| Caso | Pedido | Token | Detalle | Esperado | `datos` |
|---|---|---|---|---|---|
| Admin: cuenta común | `GET /admin/estadisticas` | Mónica |  | **403** | Sólo un administrador puede acceder. |
| Admin: sin token | `GET /admin/estadisticas` | ninguno |  | **401** | Token no proporcionado. |
| Admin: dias=0 | `GET /admin/estadisticas?dias=0` | Admin |  | **400** | El campo días debe ser un número entero entre 1 y 90. |
| Admin: acción inválida | `GET /admin/actividad?accion=borrar` | Admin |  | **400** | El campo acción debe ser uno de: login, alta, modificacion, eliminacion, consulta. |
| Admin: identificar sin motivo | `GET /admin/usuarios/{id}` | Admin | sin `motivo` | **400** | Indicá el motivo para identificar la cuenta. |
| Admin: identificar inexistente | `GET /admin/usuarios/999999?motivo=x` | Admin |  | **404** | Usuario no encontrado. |

### Entre familias (con el token de Mónica sobre datos de los Herrera)

Un usuario nunca ve ni toca datos de otra familia. El back responde **404** (y no 403) para no revelar que el registro existe.

| Caso | Pedido | Esperado | `datos` |
|---|---|---|---|
| Editar integrante de otra familia | `PATCH /familia/integrantes/{Lucas}` | **404** | Integrante no encontrado. |
| Borrar integrante de otra familia | `DELETE /familia/integrantes/{Lucas}` | **404** | Integrante no encontrado. |
| Editar mascota de otra familia | `PATCH /familia/mascotas/{Mora}` | **404** | Mascota no encontrada. |
| Contacto en integrante de otra familia | `POST /familia/integrantes/{Lucas}/contactos-emergencia` | **404** | Integrante no encontrado. |
| Vacuna en integrante de otra familia | `POST /salud/vacunas con integrante_id {Lucas}` | **404** | Integrante o mascota no encontrado. |
| Vacunas de otra familia (listar) | `GET /salud/vacunas?integrante_id={Lucas}` | **404** | Integrante o mascota no encontrado. |
| Editar vacuna de otra familia | `PATCH /salud/vacunas/{vacuna de Lucas}` | **404** | Vacuna no encontrada. |
| Historial de otra familia | `GET /salud/historial?integrante_id={Lucas}` | **404** | Integrante o mascota no encontrado. |
| Profesional en mascota de otra familia | `POST /salud/profesionales con mascota_id {Mora}` | **404** | Registro no encontrado. |
| Recordatorio vacuna de otra familia | `POST /recordatorios con vacuna_id {vacuna de Lucas}` | **404** | Vacuna no encontrada. |
| Editar recordatorio de otra familia | `PATCH /recordatorios/{recordatorio de los Herrera}` | **404** | Recordatorio no encontrado. |
| Adjuntos de otra familia (listar) | `GET /adjuntos?integrante_id={Lucas}` | **404** | Registro no encontrado. |

## Notas

- Un usuario sin grupo que lista integrantes recibe 200 con una lista vacía, no un error.
- `PATCH` reemplaza el registro: hay que mandar todos los campos obligatorios, no sólo el que cambia.
- Subir adjuntos necesita las claves de Cloudinary y un archivo: se prueba a mano (carpeta 13).
- Cada alta, edición o baja que sale bien queda en el registro de actividad: se puede verificar después con `GET /admin/actividad?usuario_id=...`.
