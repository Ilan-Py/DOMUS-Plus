//Codigo por ILAN PITASHNY
//1 — Middleware de autenticacion JWT
const jwt = require('jsonwebtoken');

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
        return res.status(403).json({
            codigo: 403,
            estado: 'error',
            datos: 'Token inválido o expirado.'
        });
    }
}

module.exports = { verificarToken };
