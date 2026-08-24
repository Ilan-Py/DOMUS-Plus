//Codigo por ILAN PITASHNY
//1 — Rutas protegidas: recordatorios y calendario
const express        = require('express');
const router         = express.Router();
const { verificarToken } = require('../config/auth');
const {
    crearRecordatorio,
    listarRecordatorios,
    desactivarRecordatorio
} = require('../controllers/recordatoriosController');

router.use(verificarToken);

router.post('/',           crearRecordatorio);
router.get('/',            listarRecordatorios);
router.patch('/:id/desactivar', desactivarRecordatorio);

module.exports = router;
