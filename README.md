# DOMUS+ — Plataforma de Gestión de Salud y Cuidados del Grupo Familiar

DOMUS+ es una aplicación mobile orientada a centralizar la información de salud y cuidados del grupo familiar, incluyendo tanto personas como mascotas. Permite registrar tratamientos, vacunas e historial médico, y configurar recordatorios para controles y medicación periódica.

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
| Frontend / Mobile | React Native |
| Backend | Node.js (CommonJS) |
| Base de datos | MySQL |
| Autenticación | JWT |
| Control de versiones | Git y GitHub |
| Gestión de tareas | Jira |
| Entorno de desarrollo | Visual Studio Code |

---

## Estructura del repositorio

```
Domus-Plus/
├── .gitignore
├── README.md
├── backend/
│   ├── package.json
│   ├── .env.example        # Copiar como .env y completar con datos locales
│   └── src/
│       ├── app.js          # Servidor principal
│       ├── config/
│       │   ├── db.js       # Conexión a MySQL
│       │   └── auth.js     # Middleware JWT
│       ├── controllers/    # Lógica de negocio por módulo
│       │   ├── authController.js
│       │   ├── familiaController.js
│       │   ├── saludController.js
│       │   └── recordatoriosController.js
│       ├── routes/         # Definición de endpoints por módulo
│       │   ├── auth.routes.js
│       │   ├── familia.routes.js
│       │   ├── salud.routes.js
│       │   └── recordatorios.routes.js
│       └── Scripts/
│           ├── 01_schema.sql   # Creación de base de datos y tablas
│           └── 02_inserts.sql  # Datos de prueba para desarrollo
└── frontend/               # React Native — en desarrollo
```

---

## Cómo levantar el backend

### Requisitos previos
- Node.js instalado
- MySQL / XAMPP corriendo

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Ilan-Py/DOMUS-Plus
cd Domus-Plus/backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Completar DB_PASSWORD y JWT_SECRET en el archivo .env

# 4. Ejecutar los scripts SQL (en HeidiSQL o phpMyAdmin, en orden)
#    backend/Scripts/01_schema.sql
#    backend/Scripts/02_inserts.sql

# 5. Levantar el servidor
node src/app.js
```

Si todo está correctamente configurado, la consola debe mostrar:
```
Servidor DOMUS+ corriendo en http://localhost:3000
Base de datos conectada correctamente.
```

Verificación rápida: `GET http://localhost:3000/api/ping`

---

## Endpoints disponibles

### Autenticación (públicos)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registrar` | Registrar nuevo usuario (CU1) |
| POST | `/api/auth/login` | Iniciar sesión, devuelve JWT (CU2) |

### Familia (requieren token JWT)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/familia/grupo` | Crear grupo familiar (CU3) |
| GET | `/api/familia/grupo` | Obtener grupo familiar |
| POST | `/api/familia/integrantes` | Agregar integrante (CU4) |
| GET | `/api/familia/integrantes` | Listar integrantes |
| POST | `/api/familia/mascotas` | Registrar mascota (CU5) |
| GET | `/api/familia/mascotas` | Listar mascotas |

### Salud (requieren token JWT)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/salud/vacunas` | Registrar vacuna (CU7) |
| GET | `/api/salud/vacunas` | Listar vacunas por perfil |
| POST | `/api/salud/tratamientos` | Registrar tratamiento (CU6) |
| GET | `/api/salud/tratamientos` | Listar tratamientos por perfil |
| GET | `/api/salud/historial` | Consultar historial (CU10) |

### Recordatorios (requieren token JWT)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/recordatorios` | Crear recordatorio (CU8) |
| GET | `/api/recordatorios` | Listar recordatorios / calendario (CU9) |
| PATCH | `/api/recordatorios/:id/desactivar` | Desactivar recordatorio |

---

## Estado del proyecto

| Sprint | Módulo | Estado |
|---|---|---|
| Sprint 1 | Infraestructura base y BD | ✅ Completado |
| Sprint 2 | Autenticación y gestión de perfiles | 🔄 En desarrollo |
| Sprint 3 | Registro de salud y tratamientos | ⏳ Pendiente |
| Sprint 4 | Recordatorios y calendario | ⏳ Pendiente |
| Sprint 5 | Integración, testing y ajustes finales | ⏳ Pendiente |

---

## Documentación

- Documento fundacional del proyecto (Etapa 2)
- Casos de uso especificados: CU1 a CU11
- Mockup navegable de la aplicación

Disponibles en la carpeta `/docs` del proyecto o en las páginas del proyecto en Jira.
