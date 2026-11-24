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
  prisma/seed.js              # Datos de demo (3 usuarios, pass Admin123)
  src/app.js                  # Express: middlewares, montaje de rutas, 404
  src/config/                 # auth (JWT), prisma (singleton), cloudinary, upload (multer), rateLimiter
  src/routes/*.routes.js      # Sólo wiring de rutas → controllers
  src/controllers/*.js        # Lógica + validación + queries
  src/utils/grupo.js          # Helpers de pertenencia a grupo (ver "Seguridad")
frontend/
  App.js                      # Fuentes, ramas de navegación (boot/auth/onboarding/main)
  src/api/client.js           # Axios: token + desenvuelve el envelope (ÚNICO lugar)
  src/context/                # AuthContext, FamilyContext
  src/navigation/MainTabs.js  # Tabs Familia / Calendario / Cuenta + stacks
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

- `Dockerfile.dev` arranca con `nodemon` y **no** corre migraciones solo (el README dice lo
  contrario — no confiar en eso). Después de cambiar `schema.prisma`, correr `migrate dev`.
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
- Validar **antes** de llegar a Prisma: un enum inválido, una fecha inválida o un id `NaN` hacen
  que Prisma tire y termine en 500. Ids: `Number(req.params.id)` + verificar `Number.isInteger`.
- `PrismaClient` es singleton en `src/config/prisma.js` — nunca instanciar otro.
- Error de unique de Prisma = `err.code === 'P2002'`.
- Prisma no genera CHECK constraints: las reglas "exactamente uno de N padres" viven en el
  controller (`extraerPadreUnico` en `utils/grupo.js`).
- Enums de BD en minúscula: `adulto|menor|mayor`, `vacuna|control|medicacion`, `imagen|pdf`,
  rol `dueno|miembro` (sin ñ).
- Los archivos llevan una cabecera de autoría (`//Codigo por ...`). Respetarla; no reescribirla.

**Seguridad — pertenencia al grupo (lo más importante):**
- Todo dato cuelga de un `GrupoFamiliar`. Un usuario pertenece a **un solo** grupo (`GrupoMiembro.usuarioId` es unique).
- Siempre resolver el grupo del usuario autenticado (`resolverGrupoId(req.usuario.id)`) y filtrar por él.
- Para editar/borrar por id usar `updateMany`/`deleteMany` con `where: { id, grupoId }` y
  devolver 404 si `count === 0` (no revelar si el registro existe en otro grupo).
- Para registros hijos (vacuna, tratamiento, historial, adjunto, contacto, profesional) usar
  `verificarPertenenciaDirecta` / `verificarPertenencia{Vacuna,Tratamiento,Historial}`.
- ⚠️ Pendiente conocido: en `saludController`, `registrar/listar` de vacunas y tratamientos y
  `consultarHistorial` **no verifican pertenencia** del `integrante_id`/`mascota_id` (IDOR).
  Cualquier endpoint nuevo debe verificar.

## Contrato API ↔ frontend (cuidado)

- El frontend envía **snake_case** (`fecha_nacimiento`, `tipo_sangre`, `fecha_hora`, `integrante_id`).
- El frontend también **lee snake_case** de las respuestas (`item.fecha_hora`, `item.tipo_archivo`,
  `integrante.tipo_sangre`, `memberToEdit.fecha_nacimiento`).
- ⚠️ Desde la migración a Prisma, muchos controllers devuelven el objeto de Prisma **tal cual, en
  camelCase** (`fechaHora`, `tipoArchivo`, `tipoSangre`, `fechaNacimiento`). Antes de dar por
  bueno un endpoint, verificar qué claves lee la pantalla que lo consume. Al tocar un controller,
  devolver las claves que espera el frontend (snake_case) en vez de cambiar todas las pantallas.
- El interceptor de `client.js` devuelve directamente `datos`; los errores llegan como
  `{ status, mensaje }`. Para listas usar `getList(url)` (garantiza array).
- `PATCH /api/recordatorios/:id/desactivar` devuelve un string en `datos`, no un objeto.
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
  Prisma 6 pero `package.json` usa `^5.22`, y lo de migraciones automáticas no es cierto.
- `docs/API_NOTES.md` — contratos y trampas. **Parcialmente desactualizado:** menciona MySQL y
  formato DATETIME de MySQL, y que el JWT vencido da 403 (hoy da 401). El punto del IDOR sigue vigente.
- `docs/SPRINT_STATUS.md`, `frontend/todo.md` — backlog del frontend con estado verificado por ítem.
- `docs/QA_CHECKLIST.md` — checklist de pruebas manuales.
- `docs/scripts-viejos/` — SQL previo a Prisma. Sólo referencia histórica; no usar.
  (`docker-compose.yml` todavía monta `backend/Scripts/postgres/*.sql`, que ya no existe ahí.)
