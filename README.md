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
| Ilan Pitashny | Business Analyst / QA Tester |

---

## Tecnologías

| Área | Tecnología |
|---|---|
| Frontend / Mobile | React Native (Expo, SDK 51) |
| Backend | Node.js (CommonJS) |
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
│   ├── .env.example         # Copiar como .env y completar (local Postgres o Supabase)
│   ├── Scripts/
│   │   ├── 01_schema.sql … 05_emergencia.sql   # Migraciones originales (MySQL, historial)
│   │   └── postgres/
│   │       ├── 01_schema.sql    # Schema consolidado (Postgres/Supabase)
│   │       └── 02_inserts.sql   # Datos de prueba (Postgres/Supabase)
│   └── src/
│       ├── app.js               # Servidor principal
│       ├── config/
│       │   ├── db.js            # Pool de conexión a Postgres (pg)
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

## Cómo levantar el backend

### Requisitos previos
- Docker y Docker Compose

### Pasos (Docker — recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Ilan-Py/DOMUS-Plus
cd Domus-Plus

# 2. Configurar variables de entorno
cp .env.example .env
cp backend/.env.example backend/.env
# Completar JWT_SECRET y las credenciales de Cloudinary

# 3. Levantar todo (Postgres + backend)
docker compose up -d --build
```

`docker-compose.yml` levanta un Postgres local (imagen oficial `postgres`) y
aplica automáticamente `backend/Scripts/postgres/01_schema.sql` +
`02_inserts.sql` (datos de prueba) la primera vez que se crea el volumen.
No hace falta correr nada a mano.

Para apuntar el backend a Supabase en vez del Postgres local (staging/prod),
completar la sección "Supabase" de `backend/.env.example` con el connection
string del **Session pooler** del dashboard de Supabase (Settings >
Database > Connection Pooling) — el de conexión directa resuelve solo a
IPv6 y falla en redes/Docker sin salida IPv6.

Si todo está correctamente configurado, la consola debe mostrar:
```
Servidor DOMUS+ corriendo en http://localhost:3000
Base de datos conectada correctamente.
```

Verificación rápida: `GET http://localhost:3000/api/ping`

---

## Despliegue

### Backend

El backend de staging/producción corre en **Render** (Web Service, build
`npm install` / start `npm start`) conectado a **Supabase Postgres** vía el
Session pooler. Render inyecta su propio `PORT` (el servidor ya lo lee de
`process.env.PORT`) y las credenciales de Supabase/Cloudinary/JWT se cargan
como variables de entorno del servicio, no desde un `.env` commiteado.

URL actual: `https://domus-plus.onrender.com` — `GET /api/ping` para
verificar que está arriba (nota: el plan free de Render apaga el servicio
tras ~15 min de inactividad, así que el primer request después de un rato
puede tardar ~50s en responder mientras arranca de nuevo).

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

---

## Estado del proyecto

| Sprint | Módulo | Estado |
|---|---|---|
| Sprint 1 | Infraestructura base y BD | ✅ Completado |
| Sprint 2 | Autenticación y gestión de perfiles | ✅ Completado |
| Sprint 3 | Registro de salud y tratamientos | ✅ Completado |
| Sprint 4 | Recordatorios y calendario | ✅ Completado |
| Sprint 5 | Integración, testing y ajustes finales | ⏳ Pendiente |
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
