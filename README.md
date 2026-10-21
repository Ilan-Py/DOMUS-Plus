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
| Agustina Di Pasquale | Frontend Developer / Project Manager |
| Alan Acevedo | Full Stack Developer / DevOps |
| Ilan Pitashny | Backend Developer / Software Architect |

---

## Tecnologías

| Área | Tecnología |
|---|---|
| Frontend / Mobile | React Native (Expo, SDK 51) |
| Backend | Node.js (CommonJS) + Express |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL 16 (Supabase en staging/prod, contenedor Docker local en desarrollo) |
| Autenticación | JWT |
| Archivos adjuntos | Cloudinary |
| Hosting del backend | Render (Web Service, conectado a Supabase vía Session pooler) |
| Build & distribución mobile | EAS Build (APK instalable, sin publicación en Play Store) |
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
├── docker-compose.yml           # Postgres local + backend para desarrollo
├── .github/
│   └── workflows/
│       └── eas-update.yml       # Publica OTA automáticamente en cada push a main
├── backend/
│   ├── package.json
│   ├── Dockerfile               # Imagen de producción
│   ├── Dockerfile.dev           # Imagen de desarrollo (usada por docker-compose)
│   ├── .env.example             # Copiar como .env y completar
│   ├── prisma/
│   │   ├── schema.prisma        # Esquema de la base de datos (fuente de verdad)
│   │   ├── migrations/          # Historial de migraciones Prisma
│   │   └── seed.js              # Datos de prueba
│   ├── Scripts/
│   │   └── postgres/
│   │       ├── 01_schema.sql    # Schema SQL para inicialización del contenedor local
│   │       └── 02_inserts.sql   # Datos de prueba para desarrollo local
│   └── src/
│       ├── app.js               # Servidor principal
│       ├── config/
│       │   ├── prisma.js        # Cliente Prisma (singleton)
│       │   ├── auth.js          # Middleware JWT
│       │   ├── cloudinary.js    # Config de Cloudinary
│       │   ├── upload.js        # Config de multer
│       │   └── rateLimiter.js   # Rate limiting de subida de adjuntos
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── familiaController.js
│       │   ├── saludController.js
│       │   ├── recordatoriosController.js
│       │   ├── adjuntoController.js
│       │   ├── contactoEmergenciaController.js
│       │   └── profesionalSaludController.js
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── familia.routes.js
│       │   ├── salud.routes.js
│       │   ├── recordatorios.routes.js
│       │   └── adjuntos.routes.js
│       └── utils/
│           └── grupo.js         # Helpers de pertenencia a grupo
└── frontend/
    ├── package.json
    ├── App.js                   # Entry point, navegación raíz
    ├── app.json
    ├── eas.json                 # Perfiles de build EAS y canales de EAS Update
    ├── assets/
    └── src/
        ├── api/                 # client.js (Axios + interceptors), session.js
        ├── context/             # AuthContext, FamilyContext
        ├── theme/               # colors, spacing, typography
        ├── navigation/          # MainTabs
        ├── hooks/               # useUnsavedChangesGuard
        ├── utils/               # confirm, displayFormat
        ├── components/          # PrimaryButton, ScreenHeader, SegmentedControl, ...
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

## Cómo levantar el backend (desarrollo local)

### Requisitos previos

- Docker y Docker Compose
- Credenciales de Cloudinary (para subida de adjuntos — opcional en desarrollo)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Ilan-Py/DOMUS-Plus
cd Domus-Plus

# 2. Configurar variables de entorno del backend
cp backend/.env.example backend/.env
# Completar JWT_SECRET y, si se van a probar adjuntos, las credenciales de Cloudinary.
# DATABASE_URL ya viene configurada para el contenedor local en docker-compose.yml.

# 3. Levantar Postgres + backend
docker compose up -d --build
```

El `docker-compose.yml` levanta dos servicios:

- **db** — PostgreSQL 16 (imagen oficial). La primera vez que se crea el volumen aplica automáticamente `backend/Scripts/postgres/01_schema.sql` (schema completo) y `02_inserts.sql` (datos de prueba). No hace falta correr nada a mano.
- **backend** — nodemon sobre Node 20. El `Dockerfile.dev` corre `prisma generate` al buildear para que el cliente Prisma esté disponible.

Verificación: `GET http://localhost:3000/api/ping` debe devolver `{ "estado": "ok" }`.

> **Nota:** el volumen de Postgres (`domus_pg_data`) persiste entre reinicios. Si necesitás resetear la base de datos a cero: `docker compose down -v && docker compose up -d --build`.

### Apuntar al Supabase de staging/prod

En `backend/.env`, reemplazar `DATABASE_URL` con el connection string del **Session pooler** de Supabase (Settings → Database → Connection Pooling). Usar el Session pooler y no la conexión directa: la conexión directa resuelve solo a IPv6 y falla en redes/Docker sin salida IPv6.

Luego aplicar las migraciones pendientes:

```bash
npx prisma migrate deploy
```

---

## Despliegue

### Backend

Corre en **Render** (Web Service) conectado a **Supabase Postgres** vía Session pooler. Render inyecta su propio `PORT` (el servidor lo lee de `process.env.PORT`) y las credenciales se cargan como variables de entorno del servicio.

URL: `https://domus-plus.onrender.com` — `GET /api/ping` para verificar estado.

> El plan free de Render apaga el servicio tras ~15 min de inactividad. El primer request después de un período de reposo puede tardar ~50 s mientras arranca.

### App mobile (EAS Build + EAS Update)

**EAS Build** genera un APK instalable directamente en el dispositivo (no hay publicación en Play Store):

```bash
cd frontend
eas build --platform android --profile preview
```

El comando devuelve un link de descarga directa del `.apk`.

**EAS Update** publica cambios de JS/assets a los dispositivos que ya tienen la app instalada, sin necesidad de un nuevo APK. Un cambio nativo (librería nueva, permiso de Android, ícono) sí requiere un build nuevo.

```bash
eas update --channel preview --message "descripción del cambio"
eas update --channel production --message "descripción del cambio"
```

**CI/CD:** `.github/workflows/eas-update.yml` automatiza esto — cada push a `main` que toque `frontend/**` publica una actualización al canal `production`. También se puede disparar manualmente desde la pestaña **Actions** de GitHub eligiendo el canal. Requiere el secret `EXPO_TOKEN` configurado en el repositorio (Settings → Secrets → Actions), generado desde expo.dev (Account Settings → Access Tokens).

---

## Endpoints disponibles

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registrar` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión, devuelve JWT |
| PATCH | `/api/auth/perfil` | Actualizar perfil del usuario |
| PATCH | `/api/auth/password` | Cambiar contraseña |

### Familia *(requieren token JWT)*

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/familia/grupo` | Crear grupo familiar |
| GET | `/api/familia/grupo` | Obtener grupo familiar |
| PATCH | `/api/familia/grupo` | Renombrar grupo familiar |
| DELETE | `/api/familia/grupo` | Eliminar grupo familiar |
| POST | `/api/familia/grupo/invitacion` | Generar código de invitación |
| POST | `/api/familia/grupo/unirse` | Unirse a un grupo con código |
| GET | `/api/familia/grupo/miembros` | Listar miembros del grupo |
| DELETE | `/api/familia/grupo/miembros/:usuarioId` | Eliminar miembro del grupo (solo dueño) |
| POST | `/api/familia/grupo/salir` | Salir del grupo familiar |
| POST | `/api/familia/integrantes` | Agregar integrante |
| GET | `/api/familia/integrantes` | Listar integrantes |
| PATCH | `/api/familia/integrantes/:id` | Editar integrante |
| DELETE | `/api/familia/integrantes/:id` | Eliminar integrante |
| PATCH | `/api/familia/integrantes/:id/emergencia` | Actualizar datos médicos de emergencia |
| POST | `/api/familia/integrantes/:id/contactos-emergencia` | Agregar contacto de emergencia |
| GET | `/api/familia/integrantes/:id/contactos-emergencia` | Listar contactos de emergencia |
| PATCH | `/api/familia/contactos-emergencia/:id` | Editar contacto de emergencia |
| DELETE | `/api/familia/contactos-emergencia/:id` | Eliminar contacto de emergencia |
| POST | `/api/familia/mascotas` | Registrar mascota |
| GET | `/api/familia/mascotas` | Listar mascotas |
| PATCH | `/api/familia/mascotas/:id` | Editar mascota |
| DELETE | `/api/familia/mascotas/:id` | Eliminar mascota |

### Salud *(requieren token JWT)*

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/salud/vacunas` | Registrar vacuna |
| GET | `/api/salud/vacunas` | Listar vacunas por perfil |
| PATCH | `/api/salud/vacunas/:id` | Editar vacuna |
| DELETE | `/api/salud/vacunas/:id` | Eliminar vacuna |
| POST | `/api/salud/tratamientos` | Registrar tratamiento |
| GET | `/api/salud/tratamientos` | Listar tratamientos por perfil |
| PATCH | `/api/salud/tratamientos/:id` | Editar tratamiento |
| DELETE | `/api/salud/tratamientos/:id` | Eliminar tratamiento |
| GET | `/api/salud/historial` | Consultar historial |
| POST | `/api/salud/profesionales` | Agregar profesional de salud |
| GET | `/api/salud/profesionales` | Listar profesionales de salud |
| PATCH | `/api/salud/profesionales/:id` | Editar profesional de salud |
| DELETE | `/api/salud/profesionales/:id` | Eliminar profesional de salud |

### Recordatorios *(requieren token JWT)*

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/recordatorios` | Crear recordatorio |
| GET | `/api/recordatorios` | Listar recordatorios / calendario |
| PATCH | `/api/recordatorios/:id` | Editar recordatorio |
| PATCH | `/api/recordatorios/:id/desactivar` | Desactivar recordatorio |
| DELETE | `/api/recordatorios/:id` | Eliminar recordatorio |

### Adjuntos *(requieren token JWT)*

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/adjuntos` | Subir adjunto (foto/PDF, máx. 10 MB) a Cloudinary |
| GET | `/api/adjuntos` | Listar adjuntos de un perfil o registro de salud |
| DELETE | `/api/adjuntos/:id` | Eliminar adjunto |

---

## Estado del proyecto

| Sprint | Módulo | Estado |
|---|---|---|
| Sprint 1 | Infraestructura base y BD | ✅ Completado |
| Sprint 2 | Autenticación y gestión de perfiles | ✅ Completado |
| Sprint 3 | Registro de salud y tratamientos | ✅ Completado |
| Sprint 4 | Recordatorios y calendario | ✅ Completado |
| Sprint 5 | Integración, testing y ajustes finales | ⏳ En curso |
| Sprint 6 | Migración a Postgres/Supabase, grupos compartidos, adjuntos, contactos de emergencia, profesionales de salud, backend en Render, EAS Build/Update | ✅ Completado |

## Frontend — pantallas implementadas

| Pantalla | Estado |
|---|---|
| Bienvenida | ✅ Implementada |
| Login | ✅ Implementada |
| Registro | ✅ Implementada |
| Crear / unirse a grupo familiar | ✅ Implementada |
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

Disponibles en `/docs` o en las páginas del proyecto en Jira.
