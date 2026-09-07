//Codigo por Claude
//1 — Rutas protegidas: adjuntos (fotos/PDF)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verificarToken } = require('../config/auth');
const upload = require('../config/upload');
const { limitarSubidaAdjuntos } = require('../config/rateLimiter');
const { subirAdjunto, listarAdjuntos, eliminarAdjunto } = require('../controllers/adjuntoController');

router.use(verificarToken);

// upload.single(...) se invoca a mano (no como middleware directo de la
// ruta) para poder devolver siempre el {codigo,estado,datos} de la API en
// vez de la página de error genérica de Express/el error crudo de multer —
// mismo patrón que sugiere la propia doc de multer para esto.
function manejarSubida(req, res, next) {
    upload.single('archivo')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ codigo: 400, estado: 'error', datos: 'El archivo supera el tamaño máximo permitido (10MB).' });
            }
            return res.status(400).json({ codigo: 400, estado: 'error', datos: err.message });
        }
        if (err) {
            console.error('manejarSubida=', err.message);
            return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
        }
        if (req.fileFilterError) {
            return res.status(400).json({ codigo: 400, estado: 'error', datos: req.fileFilterError });
        }
        if (!req.file) {
            return res.status(400).json({ codigo: 400, estado: 'error', datos: 'Debe adjuntar un archivo.' });
        }
        next();
    });
}

// El rate limiter va ANTES de manejarSubida a propósito: rechazar barato
// (sólo necesita req.usuario.id, ya puesto por verificarToken) sin gastar el
// trabajo de parsear un multipart/subir a memoria un archivo que de todos
// modos se va a rechazar. La única ruta con rate limit — listar/eliminar no
// lo llevan.
router.post('/', limitarSubidaAdjuntos, manejarSubida, subirAdjunto);
router.get('/', listarAdjuntos);
router.delete('/:id', eliminarAdjunto);

module.exports = router;
