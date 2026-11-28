# CLAUDE.md — DOMUS+

Guía para asistentes de IA (Claude, Codex, Cursor, Copilot, etc.) que trabajen en este repo.
Leer completo antes de tocar código. Si algo de acá contradice al código, **manda el código**:
corregí este archivo en el mismo cambio.

## Qué es

DOMUS+ es una app mobile (React Native/Expo) + API REST (Node/Express + Prisma + PostgreSQL)
para gestionar la salud del grupo familiar: integrantes, mascotas, vacunas, tratamientos,
historial, adjuntos (fotos/PDF), contactos de emergencia, profesionales y recordatorios.

Es un **MVP académico** (Prácticas Profesionalizantes II, IES Santa Fe) que se demuestra a
profesores. Priorizar: que funcione en la demo, cambios chicos y reversibles, código legible
para el equipo. No sobre-ingenierizar.

Equipo: Agustina Di Pasquale (PM/Backend), Alan Acevedo (Frontend/UX), Ilan Pitashny (BA/Arquitectura).
Idioma del proyecto: **español rioplatense** (código, comentarios, mensajes de error, commits).

## Estructura

```
backend/
  prisma/schema.prisma        # Modelo de datos (fuente de verdad de la BD)
  prisma/migrations/          # Migraciones Prisma — nunca editar una ya aplicada
  prisma/seed.js              # Datos de demo (familias + admin@domus.test, pass Admin123)
  src/app.js                  # Express: middlewares, montaje de rutas, 404
  src/config/                 # auth (JWT + soloAdmin), prisma (singleton), cloudinary, upload (multer), rateLimiter
  src/routes/*.routes.js      # Sólo wiring de rutas → controllers
  src/controllers/*.js        # Lógica + validación + queries
  src/utils/actividad.js      # Registro de actividad (auditoría) para el admin
  public/admin/index.html     # Panel rudimentario del admin, servido en /admin (se reemplaza en el revamp)
  src/utils/grupo.js          # Helpers de pertenencia a grupo (ver "Seguridad")
frontend/
  App.js                      # Fuentes, ramas de navegación (boot/auth/onboarding/main)
  src/api/client.js           # Axios: token + desenvuelve el envelope (ÚNICO lugar)
  src/context/                # AuthContext, FamilyContext
  src/navigation/MainTabs.js  # Tabs Familia / Calendario / Emergencia / Cuenta + stacks
  src/screens/                # Pantallas
  src/components/             # Componentes compartidos (FormField, PrimaryButton, ScreenHeader...)
  src/utils/                  # confirm.js, displayFormat.js, notifications.js
  src/theme/                  # colors, spacing, typography — usar tokens, no valores sueltos
docs/                         # API_NOTES, SPRINT_STATUS, QA_CHECKLIST, DESIGN_SYSTEM, casos de uso, Postman
```

## Comandos

```bash
# Backend + Postgres local (desde la raíz)
docker compose up -d --build
docker compose logs -f backend
curl http://localhost:3000/api/ping

# Prisma (dentro del contenedor)
docker compose exec backend npx prisma migrate dev --name <nombre_en_snake_case>   # crea + aplica migración
docker compose exec backend npx prisma migrate deploy                              # aplica pendientes
docker compose exec backend npx prisma db seed
docker compose exec backend npx prisma studio      # (o correrlo local con DATABASE_URL apuntando a localhost:5432)

# Frontend
cd frontend && npm install && npx expo start --web   # http://localhost:8081
```

- `Dockerfile.dev` corre `prisma migrate deploy` y después `nodemon` en cada arranque: las
  migraciones ya creadas se aplican solas. Para **crear** una migración nueva después de
  cambiar `schema.prisma`, correr `migrate dev --name ...`.
- `src/` del backend está montado como volumen → nodemon recarga solo. Cambios en
  `package.json` o `schema.prisma` requieren `docker compose up -d --build`.
- No hay tests, linter ni TypeScript. Verificar a mano (Postman: `docs/DOMUS+ API.postman_collection.json`).
  TypeScript está diferido a propósito: no proponer migrarlo salvo que se pida.

## Convenciones del backend

**Envelope de respuesta — siempre, incluso en errores:**
```js
return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Mensaje legible en español.' });
return res.status(200).json({ codigo: 200, estado: 'ok', datos: resultado });
```
- 400 validación · 401 sin token/token inválido (sólo `verificarToken`) · 403 autenticado sin
  permiso (p.ej. no es dueño del grupo) · 404 no existe **o no es de tu grupo** · 409 conflicto · 500 inesperado.
- Cada handler: validar body/params → `try { ... } catch (err) { console.error('nombreHandler=', err.message); 500 }`.
- Validar **antes** de llegar a Prisma (`src/utils/validacion.js`):
  - `:id` de la URL: `router.param('id', validarIdDeRuta)` en cada archivo de rutas → 400 si no es entero positivo.
  - Body/query: cada controller define `REGLAS_*` (`texto` con `max` = largo del VarChar, `email`,
    `nombrePersona` (sólo letras, espacios, apóstrofes y guiones), `telefono`, `fecha`, `fechaHora`, `id`, `enum`) y llama a `validarCampos(req.body, REGLAS_X)` al principio.
    Sólo valida los campos que vienen; los obligatorios se siguen chequeando aparte con su mensaje.
  - Ids sueltos: `esIdValido(valor)` (también rechaza números más grandes que un Int de Postgres).
- `src/utils/errores.js`: `capturarErroresAsync(router)` en `app.js` hace que un error fuera del
  `try` termine en `manejarErrores` (500 con el formato de la API) en vez de tirar abajo el proceso.
  JSON mal formado en el body → 400.
- `PrismaClient` es singleton en `src/config/prisma.js` — nunca instanciar otro.
- Error de unique de Prisma = `err.code === 'P2002'`.
- Prisma no genera CHECK constraints: las reglas "exactamente uno de N padres" viven en el
  controller (`extraerPadreUnico` en `utils/grupo.js`).
- El `tipo` de integrante (`adulto|menor|mayor`) **no se elige**: lo calcula el back con la fecha de
  nacimiento (`tipoSegunEdad` en `familiaController`, menor < 18 ≤ adulto < 65 ≤ mayor) al guardar y al listar.
- Enums de BD en minúscula: `adulto|menor|mayor`, `vacuna|control|medicacion`, `imagen|pdf`,
  rol `dueno|miembro` (sin ñ), rol de sistema `usuario|admin`.
- **Dos niveles de rol, no mezclarlos:**
  - `GrupoMiembro.rol` (`dueno|miembro`): rol dentro de la familia. El dueño invita, renombra y quita miembros.
  - `Usuario.rol` (`usuario|admin`): rol en el sistema. El admin no tiene familia y sólo ve el registro
    de actividad y las estadísticas generales, **nunca datos médicos** de las familias.
    Las rutas de admin van con `verificarToken, soloAdmin` (`src/config/auth.js`), que lee el rol de la
    base en cada pedido. El rol nunca se asigna desde la API (registrar y perfil lo ignoran): sólo el seed o la base.
- **Registro de actividad** (`RegistroActividad`, `src/utils/actividad.js`): el middleware `registrarActividad`
  guarda las escrituras que terminan en 2xx según la tabla `RUTAS` (acción, entidad, id); el login se registra
  en `authController`. **Un endpoint de escritura nuevo se agrega a `RUTAS`.** Nunca guardar el body, contraseñas,
  tokens ni datos médicos. Retención: `RETENCION_ACTIVIDAD_DIAS` (180 por defecto).
- **Estadísticas del admin** (`adminController`): sólo valores globales, sin filtros por familia. Las cuentas
  `admin` no cuentan como usuarios. Las especies de mascotas se agrupan normalizando al contar (sin mayúsculas,
  acentos ni espacios de más), sin tocar lo guardado; `otro`/vacío → «Sin especificar».
- El backend corre con `TZ=America/Argentina/Buenos_Aires` (docker-compose): las fechas con hora local del seed
  y los días de las estadísticas dependen de eso.
- Los archivos llevan una cabecera de autoría (`//Codigo por ...`). Respetarla; no reescribirla.

**Seguridad — pertenencia al grupo (lo más importante):**
- Todo dato cuelga de un `GrupoFamiliar`. Un usuario pertenece a **un solo** grupo (`GrupoMiembro.usuarioId` es unique).
- Siempre resolver el grupo del usuario autenticado (`resolverGrupoId(req.usuario.id)`) y filtrar por él.
- Para editar/borrar por id usar `updateMany`/`deleteMany` con `where: { id, grupoId }` y
  devolver 404 si `count === 0` (no revelar si el registro existe en otro grupo).
- Para registros hijos (vacuna, tratamiento, historial, adjunto, contacto, profesional) usar
  `verificarPertenenciaDirecta` / `verificarPertenencia{Vacuna,Tratamiento,Historial}`.
- Endpoints que reciben `integrante_id`/`mascota_id` (o `vacuna_id`/`tratamiento_id`) por body o
  query verifican que ese registro sea del grupo **antes** de leer o escribir. Ver
  `padreEsDelUsuario` en `saludController`. Cualquier endpoint nuevo debe hacer lo mismo.

## Contrato API ↔ frontend (cuidado)

- El frontend envía **snake_case** (`fecha_nacimiento`, `tipo_sangre`, `fecha_hora`, `integrante_id`).
- El frontend también **lee snake_case** de las respuestas (`item.fecha_hora`, `item.tipo_archivo`,
  `integrante.tipo_sangre`, `memberToEdit.fecha_nacimiento`).
- Prisma devuelve los modelos en camelCase (`fechaHora`, `tipoSangre`...). El middleware
  `respuestasEnSnakeCase` (`backend/src/utils/respuestas.js`, montado en `app.js`) convierte
  todas las claves de `datos` a snake_case antes de responder. Los controllers pueden devolver
  el objeto de Prisma tal cual; **no** mapear claves a mano ni leer camelCase en el frontend.
- El interceptor de `client.js` devuelve directamente `datos`; los errores llegan como
  `{ status, mensaje }`. Para listas usar `getList(url)` (garantiza array).
- `PATCH /api/recordatorios/:id/desactivar` devuelve un string en `datos`, no un objeto. Hoy equivale a marcar «hecho» ahora;
  la app usa `marcar`/`reactivar`.
- Marca de dosis/turnos: `PATCH /api/recordatorios/:id/marcar` con `{ estado: 'hecho' | 'omitido', hecho_a? }` (cuándo pasó;
  ni futura ni más de un día antes de lo programado) y `PATCH /api/recordatorios/:id/reactivar` («Deshacer», vuelve a `pendiente`).
  Cada recordatorio tiene `estado` (`pendiente|hecho|omitido`), `hecho_a` y `marcado_por: { id, nombre }`; `activo` queda en
  sincronía (`activo` = `estado === 'pendiente'`).
- En Windows, nodemon dentro de Docker a veces no ve los cambios de `src/`: `docker compose restart backend`.
- Recordatorios periódicos (MEJ-005): `POST /api/recordatorios` con `repetir_cada_dias` (1–365; "cada mes" = 30)
  y `repetir_veces` (2–100, default 10) crea **una fila por repetición**, todas con el mismo `serie_id`.
  `DELETE /api/recordatorios/:id?alcance=siguientes` borra esa y las posteriores de la serie; sin
  `alcance`, sólo esa. Editar/desactivar afectan sólo a esa repetición.
- `POST /api/auth/registrar` no devuelve token: hay que llamar a login después.

## Convenciones del frontend

- **`Alert.alert` no hace nada en web** (react-native-web). Para confirmaciones usar
  `confirmarDestructivo()` y para menús `elegirOpcion()` de `src/utils/confirm.js`. Nunca
  `Alert.alert` con botones directo.
- **Fechas:** nunca `toISOString()` para fechas de solo-día (corre un día por UTC-3). Usar
  `formatDateOnly`/`formatTimeOnly` (`components/DatePickerField.js`), `parseApiDate` y
  `parseFechaHora` (`utils/displayFormat.js`).
- Enums: la UI muestra labels capitalizados; el payload va en minúscula.
- Usar `ScreenHeader`, `FormField`, `PrimaryButton`, `ErrorBanner`, `EmptyState` y los tokens de
  `src/theme/` en vez de estilos sueltos. Ver `docs/DESIGN_SYSTEM.md`.
- **Sistema papercut (review UI/UX, `docs/ux/`):** código nuevo importa de `src/theme/tokens.js` (`color`, `texto`,
  `espacio`, `radio`, `tactil`, `tipoEvento`, `estadoDosis`). Componentes: `PaperBanner`, `StatChip`, `EventItem`,
  `EmptySlot`, `AddMenu` (el único «Agregar» de la app), `Ilustracion`, `MemberCard`/`PetCard`; catálogo vivo en
  `http://localhost:8081/styleguide` y reglas en `docs/ux/04-design-system.md`. Sin degradados, vidrio ni blur;
  sombras de papel (corridas, `shadowRadius: 0`).
- **Textos:** voz y vocabulario en `docs/ux/05-copy.md` (dosis «dada / no se dio / sin marcar», «persona con acceso»
  vs «integrante», sin «¿Seguro que…?»). Plurales y fechas con `src/utils/formato.js` (`plural`, `cuandoEvento`,
  `fechaCorta` — nunca «mar 24»); textos repetidos en `src/utils/textos.js`.
- **Toasts:** `mostrarToast(texto, 'error')` en todo `catch`; acciones reversibles con
  `mostrarToast(texto, { accion: { etiqueta: 'Deshacer', onPress } })`.
- **Marcar dosis/turnos:** siempre por `src/data/dosis.js` (`marcar`, `pasar`, `horaParaPasar`), no con `desactivar`.
- **Sin conexión:** `src/utils/cacheLocal.js` guarda familia, contactos y tratamientos para abrir la ficha sin red; se
  borra en `clearSession`. No guardar ahí nada más.
- Se prueba en **web** (Chrome, Firefox, Brave) y Android físico (`adb reverse tcp:3000 tcp:3000`).
  iOS no está validado.

## Flujo de trabajo

- `main` es estable. Trabajar en ramas `feature/<tema>` o `fix/<tema>` y mergear por PR.
- ⚠️ Cada push a `main` que toque `frontend/**` **publica una actualización OTA** (EAS Update)
  vía GitHub Actions — a los teléfonos con el APK les llega solo. No pushear a `main` cosas sin probar.
- Errores y mejoras se registran con códigos `ERR-###` / `MEJ-###` (documento "DOMUS+ | Errores y
  mejoras" del equipo). Un commit por código cuando se pueda:
  `fix(ERR-008): validar nombre y apellido sin números` · `feat(MEJ-005): recordatorios periódicos`.
- Cambios al schema: una migración Prisma por cambio, con nombre descriptivo. No editar
  migraciones ya aplicadas.
- No commitear `.env` ni credenciales (Cloudinary, JWT, Supabase).

## Documentación existente (y su estado)

- `README.md` — setup, endpoints, despliegue (Render + Supabase, EAS). Mayormente al día; dice
  Prisma 6 pero `package.json` usa `^5.22`.
- `docs/API_NOTES.md` — contratos y trampas. **Parcialmente desactualizado:** menciona MySQL y
  formato DATETIME de MySQL, y que el JWT vencido da 403 (hoy da 401). El punto del IDOR sigue vigente.
- `docs/SPRINT_STATUS.md`, `frontend/todo.md` — backlog del frontend con estado verificado por ítem.
- `docs/QA_CHECKLIST.md` — checklist de pruebas manuales.
- `docs/scripts-viejos/` — SQL previo a Prisma. Sólo referencia histórica; no usar.
