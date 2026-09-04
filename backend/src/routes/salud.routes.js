//Codigo por ILAN PITASHNY
//1 — Rutas protegidas: vacunas, tratamientos e historial
const express        = require('express');
const router         = express.Router();
const { verificarToken } = require('../config/auth');
const {
    registrarVacuna, listarVacunas, editarVacuna, eliminarVacuna,
    registrarTratamiento, listarTratamientos, editarTratamiento, eliminarTratamiento,
    consultarHistorial
} = require('../controllers/saludController');

router.use(verificarToken);

router.post('/vacunas',        registrarVacuna);
router.get('/vacunas',         listarVacunas);
router.patch('/vacunas/:id',   editarVacuna);
router.delete('/vacunas/:id',  eliminarVacuna);

router.post('/tratamientos',   registrarTratamiento);
router.get('/tratamientos',    listarTratamientos);
router.patch('/tratamientos/:id', editarTratamiento);
router.delete('/tratamientos/:id', eliminarTratamiento);

router.get('/historial',       consultarHistorial);

module.exports = router;
