//Codigo por ILAN PITASHNY
//1 — Rutas publicas: registro e inicio de sesion
const express = require('express');
const router  = express.Router();
const { registrar, login, actualizarPerfil, cambiarPassword, eliminarCuenta } = require('../controllers/authController');
const { verificarToken } = require('../config/auth');

router.post('/registrar', registrar);
router.post('/login',     login);

router.patch('/perfil',   verificarToken, actualizarPerfil);
router.patch('/password', verificarToken, cambiarPassword);
router.delete('/cuenta',  verificarToken, eliminarCuenta);

module.exports = router;
