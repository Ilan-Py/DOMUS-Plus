//Codigo por ILAN PITASHNY
//1 — Rutas publicas: registro e inicio de sesion
const express = require('express');
const router  = express.Router();
const { registrar, login } = require('../controllers/authController');

router.post('/registrar', registrar);
router.post('/login',     login);

module.exports = router;
