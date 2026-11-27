//Codigo por ILAN PITASHNY
//1 — Middleware de autenticacion JWT
const jwt = require('jsonwebtoken');
const prisma = require('./prisma');

function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({
            codigo: 401,
            estado: 'error',
            datos: 'Token no proporcionado.'
        });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = payload; // { id, email }
        next();
    } catch (err) {
        return res.status(401).json({
            codigo: 401,
            estado: 'error',
            datos: 'Token inválido o expirado.'
        });
    }
}

//2 — Sólo administradores del sistema (va después de verificarToken)
// El rol se lee de la base en cada pedido, no del token: si a alguien se le quita
// el rol de admin, deja de tener acceso en ese momento y no cuando venza el token.
async function soloAdmin(req, res, next) {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.usuario.id },
            select: { rol: true }
        });
        if (!usuario || usuario.rol !== 'admin') {
            return res.status(403).json({
                codigo: 403,
                estado: 'error',
                datos: 'Sólo un administrador puede acceder.'
            });
        }
        next();
    } catch (err) {
        console.error('soloAdmin=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { verificarToken, soloAdmin };
