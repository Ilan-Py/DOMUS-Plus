//Codigo por ILAN PITASHNY
//1 — Rutas protegidas: grupo familiar, integrantes y mascotas
const express        = require('express');
const router         = express.Router();
const { verificarToken } = require('../config/auth');
const {
    crearGrupo, obtenerGrupo,
    agregarIntegrante, listarIntegrantes,
    agregarMascota, listarMascotas
} = require('../controllers/familiaController');

//2 — Todas requieren token JWT
router.use(verificarToken);

router.post('/grupo',          crearGrupo);
router.get('/grupo',           obtenerGrupo);

router.post('/integrantes',    agregarIntegrante);
router.get('/integrantes',     listarIntegrantes);

router.post('/mascotas',       agregarMascota);
router.get('/mascotas',        listarMascotas);

module.exports = router;
