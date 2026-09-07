//Codigo por ILAN PITASHNY
//1 — Rutas protegidas: grupo familiar, integrantes y mascotas
const express        = require('express');
const router         = express.Router();
const { verificarToken } = require('../config/auth');
const {
    crearGrupo, obtenerGrupo, renombrarGrupo,
    generarInvitacion, unirseGrupo, listarMiembros, eliminarMiembro, salirGrupo, eliminarGrupo,
    agregarIntegrante, listarIntegrantes, editarIntegrante, eliminarIntegrante,
    editarEmergenciaIntegrante,
    agregarMascota, listarMascotas, editarMascota, eliminarMascota
} = require('../controllers/familiaController');
const {
    crearContacto, listarContactos, editarContacto, eliminarContacto
} = require('../controllers/contactoEmergenciaController');

//2 — Todas requieren token JWT
router.use(verificarToken);

router.post('/grupo',          crearGrupo);
router.get('/grupo',           obtenerGrupo);
router.patch('/grupo',         renombrarGrupo);
router.delete('/grupo',        eliminarGrupo);

router.post('/grupo/invitacion',       generarInvitacion);
router.post('/grupo/unirse',           unirseGrupo);
router.get('/grupo/miembros',          listarMiembros);
router.delete('/grupo/miembros/:usuarioId', eliminarMiembro);
router.post('/grupo/salir',            salirGrupo);

router.post('/integrantes',    agregarIntegrante);
router.get('/integrantes',     listarIntegrantes);
router.patch('/integrantes/:id', editarIntegrante);
router.delete('/integrantes/:id', eliminarIntegrante);
router.patch('/integrantes/:id/emergencia', editarEmergenciaIntegrante);

router.post('/integrantes/:id/contactos-emergencia',   crearContacto);
router.get('/integrantes/:id/contactos-emergencia',    listarContactos);
router.patch('/contactos-emergencia/:id',              editarContacto);
router.delete('/contactos-emergencia/:id',             eliminarContacto);

router.post('/mascotas',       agregarMascota);
router.get('/mascotas',        listarMascotas);
router.patch('/mascotas/:id',  editarMascota);
router.delete('/mascotas/:id', eliminarMascota);

module.exports = router;
