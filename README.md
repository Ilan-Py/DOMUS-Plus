# DOMUS+ — Plataforma de Gestión de Salud y Cuidados del Grupo Familiar

Proyecto académico desarrollado en el marco de **Prácticas Profesionalizantes II** — Técnico Superior en Desarrollo de Software, IES Santa Fe.

---

## Descripción

DOMUS+ es una aplicación mobile orientada a centralizar la información de salud y cuidados del grupo familiar, incluyendo tanto personas como mascotas. Permite registrar tratamientos, vacunas e historial médico, adjuntar comprobantes (fotos/PDF), llevar contactos de emergencia y profesionales de salud de referencia, y configurar recordatorios para controles y medicación periódica.

El problema que busca resolver es la falta de organización en el seguimiento de cuidados cotidianos: la mayoría de las personas depende de la memoria o de sistemas informales, lo que genera olvidos y pérdida de información relevante.

---

## Equipo

| Integrante | Rol |
|---|---|
| Agustina Di Pasquale | Project Manager / Backend Developer |
| Alan Acevedo | Frontend Developer / UX Designer |
| Ilan Pitashny | Business Analyst / Software Architect |

---

## Tecnologías

| Área | Tecnología |
|---|---|
| Frontend / Mobile | React Native (Expo, SDK 51) |
| Backend | Node.js (CommonJS) |
| ORM | Prisma 6 |
| Base de datos | PostgreSQL (Supabase en staging/prod, Postgres local en Docker para desarrollo) |
| Autenticación | JWT |
| Archivos adjuntos | Cloudinary |
| Hosting del backend | Render (Web Service, conectado a Supabase vía Session pooler) |
| Build & distribución mobile | EAS Build (APK instalable, sin publicación en Play Store por ahora) |
| Actualizaciones OTA | EAS Update (push de cambios JS/assets sin recompilar el APK) |
| CI/CD | GitHub Actions (publica OTA automáticamente en cada push a `main`) |
| Control de versiones | Git y GitHub |
| Gestión de tareas | Jira |
| Entorno de desarrollo | Visual Studio Code |

---

## Estructura del repositorio

```
Domus-Plus/
├── .gitignore
├── README.md
├── docker-compose.yml       # Postgres local + backend, para desarrollo
├── .github/
│   └── workflows/
│       └── eas-update.yml   # Publica una actualización OTA (EAS Update) en cada push a main
├── backend/
│   ├── package.json
│   ├── Dockerfile           # Imagen de producción
│   ├── Dockerfile.dev       # Imagen de desarrollo (usada por docker-compose.yml)
│   ├── .env.example         # Copiar como .env y completar
│   ├── prisma/
│   │   ├── schema.prisma    # Modelos de datos (12 modelos)
│   │   ├── seed.js          # Datos de prueba (usuarios + familia de demo)
│   │   └── migrations/      # Historial de migraciones Prisma
│   └── src/
│       ├── app.js               # Servidor principal
│       ├── config/
│       │   ├── auth.js          # Middleware JWT
│       │   ├── cloudinary.js    # Config de Cloudinary (adjuntos)
│       │   ├── upload.js        # Config de multer
│       │   └── rateLimiter.js   # Rate limiting de subida de adjuntos
│       ├── controllers/         # Lógica de negocio por módulo
│       │   ├── authController.js
│       │   ├── familiaController.js
│       │   ├── saludController.js
│       │   ├── recordatoriosController.js
│       │   ├── adjuntoController.js
│       │   ├── contactoEmergenciaController.js
│       │   └── profesionalSaludController.js
│       ├── routes/              # Definición de endpoints por módulo
│       │   ├── auth.routes.js
│       │   ├── familia.routes.js
│       │   ├── salud.routes.js
│       │   ├── recordatorios.routes.js
│       │   └── adjuntos.routes.js
│       └── utils/
│           └── grupo.js         # Resolución de grupo/membresía compartida
└── frontend/                # React Native (Expo)
    ├── package.json
    ├── App.js                # Entry point, navegación raíz
    ├── app.json
    ├── eas.json              # Perfiles de build EAS (preview/production) y canales de EAS Update
    ├── assets/               # Ícono, splash, adaptive-icon e ilustraciones
    └── src/
        ├── api/              # client.js (Axios + interceptors), session.js
        ├── context/          # AuthContext, FamilyContext
        ├── theme/            # colors, spacing, typography
        ├── navigation/       # MainTabs
        ├── hooks/            # useUnsavedChangesGuard
        ├── utils/            # confirm, displayFormat, notifications
        ├── components/       # PrimaryButton, ScreenHeader, SegmentedControl, ...
        └── screens/
            ├── WelcomeScreen.js
            ├── LoginScreen.js
            ├── RegisterScreen.js
            ├── GroupSetupScreen.js
            ├── FamilyListScreen.js
            ├── AddMemberScreen.js
            ├── ProfileDetailScreen.js
            ├── AddVaccineScreen.js
            ├── AddTreatmentScreen.js
            ├── EmergencyScreen.js
            ├── CalendarScreen.js
            ├── AddReminderScreen.js
            └── AccountScreen.js
```

---

## Cómo levantar el proyecto

### Requisitos previos
- Docker y Docker Compose

### Variables de entorno

Crear `backend/.env` con el siguiente contenido mínimo para desarrollo local:

```env
PORT=3000
JWT_SECRET=cualquier_clave_larga_para_dev
JWT_EXPIRES_IN=7d

# Cloudinary — opcional en dev (adjuntos no funcionan sin esto, el resto sí)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

> **Nota:** `DATABASE_URL` **no hace falta** en el `.env` de desarrollo. El
> `docker-compose.yml` la construye internamente como
> `postgresql://postgres@db:5432/domus_db` y se la inyecta al contenedor del
> backend. Solo es necesaria si se apunta a Supabase (ver sección Despliegue).

### Levantar el backend

```bash
# 1. Clonar el repositorio
git clone https://github.com/Ilan-Py/DOMUS-Plus
cd Domus-Plus

# 2. Crear el .env del backend
cp backend/.env.example backend/.env
# Editar backend/.env y completar JWT_SECRET

# 3. Levantar Postgres + backend
docker compose up -d --build
```

`docker-compose.yml` levanta un Postgres 16 local y el backend. En el primer
arranque, Prisma ejecuta las migraciones automáticamente al iniciar el
contenedor (`npx prisma migrate deploy` en `backend/Dockerfile.dev`). No hace
falta correr nada a mano.

> **Base creada antes de Prisma:** si tu volumen de Docker tiene tablas creadas
> con los scripts SQL viejos, el backend no arranca y el log muestra un error de
> que las tablas ya existen. Marcá la migración inicial como aplicada una vez:
> `docker compose run --rm backend npx prisma migrate resolve --applied 20260914165731_init`

Verificación rápida:

```bash
curl http://localhost:3000/api/ping
```

La consola debe mostrar:
```
Servidor DOMUS+ corriendo en http://localhost:3000
```

### Cargar datos de prueba (seed)

Una vez que el backend está corriendo, ejecutar el seed desde dentro del
contenedor:

```bash
docker compose exec backend npx prisma db seed
```

Esto crea tres usuarios con un grupo familiar y datos de demostración listos
para usar.

### Levantar el frontend (web)

```bash
cd frontend
npm install
npx expo start --web
```

Abrir `http://localhost:8081` en el navegador. La primera carga puede tardar
30-60 segundos mientras Expo compila el bundle — es normal, las cargas
siguientes son instantáneas.

> **Dispositivo físico Android:** ejecutar `adb reverse tcp:3000 tcp:3000`
> antes de abrir la app para que el dispositivo pueda alcanzar el backend en
> el puerto local.

---

## Usuarios de prueba (demo)

Después de ejecutar `npx prisma db seed`, los siguientes usuarios están
disponibles para hacer demostraciones:

La contraseña de todos es `Admin123`.

| Usuario | Email | Para qué |
|---|---|---|
| Mónica Argento | `monica@domus.test` | Dueña de la Familia Argento (familia completa de la demo) |
| José Argento | `jose@domus.test` | Miembro de la Familia Argento |
| Paola Argento | `paola@domus.test` | Sin grupo: para probar la invitación con código |
| Pablo Herrera | `pablo@domus.test` | Dueño de la Familia Herrera |
| Valeria Herrera | `valeria@domus.test` | Miembro de la Familia Herrera |
| Ilan, Agustina, Alan | `ilan@` / `agus@` / `alan@domus.test` | Una familia cada uno, con datos mínimos |
| Admin DOMUS | `admin@domus.test` | Administrador del sistema (sin familia): registro de actividad y estadísticas |

El detalle de qué trae cargado cada familia está al principio de `backend/prisma/seed.js`.

---

## Despliegue

### Backend

El backend de staging/producción corre en **Render** (Web Service, build
`npm install` / start `npm start`) conectado a **Supabase Postgres** vía el
Session pooler. Render inyecta su propio `PORT` (el servidor ya lo lee de
`process.env.PORT`) y las credenciales de Supabase/Cloudinary/JWT se cargan
como variables de entorno del servicio, no desde un `.env` commiteado.

Para apuntar el backend a Supabase en vez del Postgres local, agregar en las
variables de entorno del servicio en Render:

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

Usar el connection string del **Session pooler** del dashboard de Supabase
(Settings → Database → Connection Pooling). El de conexión directa resuelve
solo a IPv6 y falla en Docker y en Render sin salida IPv6.

URL actual: `https://domus-plus.onrender.com` — `GET /api/ping` para
verificar que está arriba (nota: el plan free de Render apaga el servicio
tras ~15 min de inactividad, así que el primer request después de un rato
puede tardar ~50s en responder mientras arranca de nuevo).

En Render conviene agregar también `TZ=America/Argentina/Buenos_Aires` (en
Docker ya está en `docker-compose.yml`): sin eso el servidor calcula en UTC los
días de las estadísticas y las fechas que arma con hora local.

### App mobile (EAS Build + EAS Update)

- **EAS Build** genera un APK instalable directamente en el dispositivo
  (perfiles `preview` y `production` en `frontend/eas.json`, ambos con
  `buildType: apk` — no hay publicación en Play Store planeada, así que no
  se usa el formato AAB). Requiere una cuenta de Expo:
  ```bash
  cd frontend
  eas build --platform android --profile preview
  ```
  El comando devuelve un link de descarga directa del `.apk`.

- **EAS Update** publica cambios de sólo JS/assets a los dispositivos que
  ya tienen la app instalada, sin necesidad de un nuevo APK (un cambio
  nativo — librería nueva, permiso de Android, ícono — sí requiere un build
  nuevo):
  ```bash
  eas update --channel preview --message "..."      # a los builds preview
  eas update --channel production --message "..."   # a los builds production
  ```
  El canal (`channel`) de cada build lo define el perfil de `eas.json` con
  el que se compiló.

- **`.github/workflows/eas-update.yml`** automatiza esto: cada push a
  `main` que toque `frontend/**` publica una actualización al canal
  `production`. También se puede disparar a mano desde la pestaña
  **Actions** de GitHub (`workflow_dispatch`), eligiendo el canal
  (`production`/`preview`/`development`) — útil para probar cambios contra
  un APK `preview` ya instalado sin esperar un build nuevo. Necesita el
  secret `EXPO_TOKEN` configurado en el repositorio (Settings → Secrets and
  variables → Actions), generado desde expo.dev (Account Settings → Access
  Tokens).

---

## Endpoints disponibles

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registrar` | Registrar nuevo usuario (CU1) |
| POST | `/api/auth/login` | Iniciar sesión, devuelve JWT (CU2) |
| PATCH | `/api/auth/perfil` | Actualizar perfil del usuario (requiere token) |
| PATCH | `/api/auth/password` | Cambiar contraseña (requiere token) |

### Familia (requieren token JWT)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/familia/grupo` | Crear grupo familiar (CU3) |
| GET | `/api/familia/grupo` | Obtener grupo familiar |
| PATCH | `/api/familia/grupo` | Renombrar grupo familiar |
| DELETE | `/api/familia/grupo` | Eliminar grupo familiar |
| POST | `/api/familia/grupo/invitacion` | Generar código de invitación al grupo |
| POST | `/api/familia/grupo/unirse` | Unirse a un grupo con un código de invitación |
| GET | `/api/familia/grupo/miembros` | Listar miembros del grupo |
| DELETE | `/api/familia/grupo/miembros/:usuarioId` | Eliminar miembro del grupo (sólo dueño) |
| POST | `/api/familia/grupo/salir` | Salir del grupo familiar |
| POST | `/api/familia/integrantes` | Agregar integrante (CU4) |
| GET | `/api/familia/integrantes` | Listar integrantes |
| PATCH | `/api/familia/integrantes/:id` | Editar integrante |
| DELETE | `/api/familia/integrantes/:id` | Eliminar integrante |
| PATCH | `/api/familia/integrantes/:id/emergencia` | Actualizar datos médicos de emergencia del integrante |
| POST | `/api/familia/integrantes/:id/contactos-emergencia` | Agregar contacto de emergencia |
| GET | `/api/familia/integrantes/:id/contactos-emergencia` | Listar contactos de emergencia |
| PATCH | `/api/familia/contactos-emergencia/:id` | Editar contacto de emergencia |
| DELETE | `/api/familia/contactos-emergencia/:id` | Eliminar contacto de emergencia |
| POST | `/api/familia/mascotas` | Registrar mascota (CU5) |
| GET | `/api/familia/mascotas` | Listar mascotas |
| PATCH | `/api/familia/mascotas/:id` | Editar mascota |
| DELETE | `/api/familia/mascotas/:id` | Eliminar mascota |

### Salud (requieren token JWT)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/salud/vacunas` | Registrar vacuna (CU7) |
| GET | `/api/salud/vacunas` | Listar vacunas por perfil |
| PATCH | `/api/salud/vacunas/:id` | Editar vacuna |
| DELETE | `/api/salud/vacunas/:id` | Eliminar vacuna |
| POST | `/api/salud/tratamientos` | Registrar tratamiento (CU6) |
| GET | `/api/salud/tratamientos` | Listar tratamientos por perfil |
| PATCH | `/api/salud/tratamientos/:id` | Editar tratamiento |
| DELETE | `/api/salud/tratamientos/:id` | Eliminar tratamiento |
| GET | `/api/salud/historial` | Consultar historial (CU10) |
| POST | `/api/salud/profesionales` | Agregar profesional de salud de referencia |
| GET | `/api/salud/profesionales` | Listar profesionales de salud |
| PATCH | `/api/salud/profesionales/:id` | Editar profesional de salud |
| DELETE | `/api/salud/profesionales/:id` | Eliminar profesional de salud |

### Recordatorios (requieren token JWT)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/recordatorios` | Crear recordatorio (CU8) |
| GET | `/api/recordatorios` | Listar recordatorios / calendario (CU9) |
| PATCH | `/api/recordatorios/:id` | Editar recordatorio |
| PATCH | `/api/recordatorios/:id/desactivar` | Desactivar recordatorio |
| DELETE | `/api/recordatorios/:id` | Eliminar recordatorio |

### Adjuntos (requieren token JWT)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/adjuntos` | Subir un adjunto (foto/PDF, máx. 10MB) a Cloudinary |
| GET | `/api/adjuntos` | Listar adjuntos de un perfil o registro de salud |
| DELETE | `/api/adjuntos/:id` | Eliminar adjunto |

### Administrador (requieren token JWT de una cuenta con rol `admin`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/estadisticas?dias=7` | Estadísticas globales: usuarios, grupos, integrantes por categoría, mascotas por especie, adjuntos y actividad del período (1 a 90 días) |
| GET | `/api/admin/actividad` | Historial de actividad paginado (`pagina`, `por_pagina`, `usuario_id`, `accion`, `desde`, `hasta`) |
| GET | `/api/admin/usuarios/:id?motivo=...` | Identifica una cuenta (nombre y email). El motivo es obligatorio y queda registrado |

El panel del administrador está en **`http://localhost:3000/admin`** (ingresar con
`admin@domus.test`). Es una página simple servida por el backend que usa estos
endpoints; se va a reemplazar en el revamp del front.

**Registro de actividad.** Cada login y cada alta, modificación o baja que sale
bien queda registrado con la cuenta, la acción, el tipo de dato, su id y la fecha.
Nunca se guarda el contenido (ni contraseñas, ni datos médicos, ni lo cargado en
los formularios). Los registros se borran solos a los 180 días
(`RETENCION_ACTIVIDAD_DIAS` para cambiarlo).

---

## Estado del proyecto

| Sprint | Módulo | Estado |
|---|---|---|
| Sprint 1 | Infraestructura base y BD | ✅ Completado |
| Sprint 2 | Autenticación y gestión de perfiles | ✅ Completado |
| Sprint 3 | Registro de salud y tratamientos | ✅ Completado |
| Sprint 4 | Recordatorios y calendario | ✅ Completado |
| Sprint 5 | Integración, testing y ajustes finales | ⏳ En curso |
| Sprint 6 | Infraestructura y despliegue (migración a Postgres/Supabase, grupos compartidos, adjuntos, contactos de emergencia, profesionales de salud, backend en Render, EAS Build/Update) | ✅ Completado |

---

## Frontend (React Native / Expo)

Conversión del mockup navegable (`docs/DOMUS+ Mockup.html`) a pantallas reales, ya conectadas al backend real (Render + Supabase) — sin datos mock.

| Pantalla | Estado |
|---|---|
| Bienvenida | ✅ Implementada |
| Login | ✅ Implementada |
| Registro | ✅ Implementada |
| Crear grupo familiar | ✅ Implementada |
| Familia · Lista | ✅ Implementada |
| Agregar / editar integrante o mascota | ✅ Implementada |
| Perfil de integrante (vacunas, tratamientos, historial, adjuntos) | ✅ Implementada |
| Agregar / editar vacuna | ✅ Implementada |
| Agregar / editar tratamiento | ✅ Implementada |
| Contactos de emergencia | ✅ Implementada |
| Profesionales de salud de referencia | ✅ Implementada |
| Calendario | ✅ Implementada |
| Agregar / editar recordatorio | ✅ Implementada |
| Mi cuenta (perfil, grupo, miembros, contraseña, cerrar sesión) | ✅ Implementada |

---

## Documentación

- Documento fundacional del proyecto (Etapa 2)
- Casos de uso especificados: CU1 a CU11
- Mockup navegable de la aplicación

Disponibles en la carpeta `/docs` del proyecto o en las páginas del proyecto en Jira.
