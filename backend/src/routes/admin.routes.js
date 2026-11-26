//1 — Rutas del panel del administrador (sólo rol 'admin')
const express = require('express');
const router = express.Router();
const { verificarToken, soloAdmin } = require('../config/auth');
const { validarIdDeRuta } = require('../utils/validacion');
const { obtenerEstadisticas, listarActividad, identificarUsuario } = require('../controllers/adminController');

router.use(verificarToken, soloAdmin);
router.param('id', validarIdDeRuta);

router.get('/estadisticas', obtenerEstadisticas);
router.get('/actividad',    listarActividad);
router.get('/usuarios/:id', identificarUsuario);

module.exports = router;
