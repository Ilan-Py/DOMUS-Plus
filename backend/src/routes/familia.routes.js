//Codigo por ILAN PITASHNY
//1 — Rutas protegidas: grupo familiar, integrantes y mascotas
const express        = require('express');
const router         = express.Router();
const { verificarToken } = require('../config/auth');
const {
    crearGrupo, obtenerGrupo,
    agregarIntegrante, listarIntegrantes, editarIntegrante, eliminarIntegrante,
    agregarMascota, listarMascotas, editarMascota, eliminarMascota
} = require('../controllers/familiaController');

//2 — Todas requieren token JWT
router.use(verificarToken);

router.post('/grupo',          crearGrupo);
router.get('/grupo',           obtenerGrupo);

router.post('/integrantes',    agregarIntegrante);
router.get('/integrantes',     listarIntegrantes);
router.patch('/integrantes/:id', editarIntegrante);
router.delete('/integrantes/:id', eliminarIntegrante);

router.post('/mascotas',       agregarMascota);
router.get('/mascotas',        listarMascotas);
router.patch('/mascotas/:id',  editarMascota);
router.delete('/mascotas/:id', eliminarMascota);

module.exports = router;
