//Codigo por ILAN PITASHNY
//1 — Servidor principal DOMUS+
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

//2 — Middlewares globales
app.use(cors());
app.use(express.json());

//3 — Rutas
const authRoutes          = require('./routes/auth.routes');
const familiaRoutes       = require('./routes/familia.routes');
const saludRoutes         = require('./routes/salud.routes');
const recordatoriosRoutes = require('./routes/recordatorios.routes');

app.use('/api/auth',          authRoutes);
app.use('/api/familia',       familiaRoutes);
app.use('/api/salud',         saludRoutes);
app.use('/api/recordatorios', recordatoriosRoutes);

//4 — Health check
app.get('/api/ping', (req, res) => {
    res.json({ codigo: 200, estado: 'ok', datos: 'DOMUS+ API funcionando.' });
});

//5 — 404 para rutas no definidas
app.use((req, res) => {
    res.status(404).json({ codigo: 404, estado: 'error', datos: 'Ruta no encontrada.' });
});

//6 — Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor DOMUS+ corriendo en http://localhost:${PORT}`);
});

module.exports = app;
