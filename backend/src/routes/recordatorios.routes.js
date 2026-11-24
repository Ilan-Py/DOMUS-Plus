//Codigo por ILAN PITASHNY
//1 — Rutas protegidas: recordatorios y calendario
const express        = require('express');
const router         = express.Router();
const { verificarToken } = require('../config/auth');
const { validarIdDeRuta } = require('../utils/validacion');
const {
    crearRecordatorio,
    listarRecordatorios,
    editarRecordatorio,
    eliminarRecordatorio,
    desactivarRecordatorio
} = require('../controllers/recordatoriosController');

router.use(verificarToken);

// Cualquier :id de la URL que no sea un entero positivo → 400 (ERR-011)
router.param('id', validarIdDeRuta);

router.post('/',           crearRecordatorio);
router.get('/',            listarRecordatorios);
router.patch('/:id/desactivar', desactivarRecordatorio);
router.patch('/:id',       editarRecordatorio);
router.delete('/:id',      eliminarRecordatorio);

module.exports = router;
