//Codigo por ILAN PITASHNY
//1 — Servidor principal DOMUS+
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

//2 — Middlewares globales
app.use(cors());
app.use(express.json());

// Prisma responde en camelCase y el frontend lee snake_case — ver utils/respuestas.js
const { respuestasEnSnakeCase } = require('./utils/respuestas');
app.use(respuestasEnSnakeCase);

// Registro de actividad para el admin: quién hizo qué acción y cuándo, sin el contenido.
const { registrarActividad, programarLimpiezaDeRegistros } = require('./utils/actividad');
app.use(registrarActividad);

//3 — Rutas
const authRoutes          = require('./routes/auth.routes');
const familiaRoutes       = require('./routes/familia.routes');
const saludRoutes         = require('./routes/salud.routes');
const recordatoriosRoutes = require('./routes/recordatorios.routes');
const adjuntosRoutes      = require('./routes/adjuntos.routes');
const adminRoutes         = require('./routes/admin.routes');

// Un error fuera del try de un handler async ya no tira abajo el servidor:
// termina en manejarErrores como un 500 con el formato de la API (ERR-011).
const { capturarErroresAsync, manejarErrores } = require('./utils/errores');

app.use('/api/auth',          capturarErroresAsync(authRoutes));
app.use('/api/familia',       capturarErroresAsync(familiaRoutes));
app.use('/api/salud',         capturarErroresAsync(saludRoutes));
app.use('/api/recordatorios', capturarErroresAsync(recordatoriosRoutes));
app.use('/api/adjuntos',      capturarErroresAsync(adjuntosRoutes));
app.use('/api/admin',         capturarErroresAsync(adminRoutes));

// Panel rudimentario del administrador (HTML estático que usa /api/admin)
const path = require('path');
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));

// Fotos de perfil de integrantes y mascotas (archivos en backend/public/fotos)
app.use('/fotos', express.static(path.join(__dirname, '..', 'public', 'fotos'), { maxAge: '1d' }));

//4 — Health check
app.get('/api/ping', (req, res) => {
    res.json({ codigo: 200, estado: 'ok', datos: 'DOMUS+ API funcionando.' });
});

//5 — 404 para rutas no definidas
app.use((req, res) => {
    res.status(404).json({ codigo: 404, estado: 'error', datos: 'Ruta no encontrada.' });
});

//6 — JSON mal formado → 400; cualquier error no capturado → 500
app.use(manejarErrores);

//7 — Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor DOMUS+ corriendo en http://localhost:${PORT}`);
});
programarLimpiezaDeRegistros(); // borra registros más viejos que RETENCION_ACTIVIDAD_DIAS

module.exports = app;
