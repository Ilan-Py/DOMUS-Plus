//Codigo por ILAN PITASHNY
//1 — Rutas protegidas: vacunas, tratamientos e historial
const express        = require('express');
const router         = express.Router();
const { verificarToken } = require('../config/auth');
const {
    registrarVacuna, listarVacunas,
    registrarTratamiento, listarTratamientos,
    consultarHistorial
} = require('../controllers/saludController');

router.use(verificarToken);

router.post('/vacunas',        registrarVacuna);
router.get('/vacunas',         listarVacunas);

router.post('/tratamientos',   registrarTratamiento);
router.get('/tratamientos',    listarTratamientos);

router.get('/historial',       consultarHistorial);

module.exports = router;
