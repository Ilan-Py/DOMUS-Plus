//Codigo por ILAN PITASHNY
//1 — Controlador de autenticacion (CU1 y CU2)
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

//2 — Validacion de formato de contrasena: min 8 caracteres, 1 mayuscula, 1 numero
function validarPassword(password) {
    return /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

//3 — CU1: Registrar usuario
async function registrar(req, res) {
    const { nombre, apellido, email, password } = req.body;

    if (!nombre || !apellido || !email || !password) {
        return res.status(400).json({
            codigo: 400,
            estado: 'error',
            datos: 'Todos los campos son obligatorios: nombre, apellido, email y password.'
        });
    }

    if (!validarPassword(password)) {
        return res.status(400).json({
            codigo: 400,
            estado: 'error',
            datos: 'La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número.'
        });
    }

    try {
        const [existente] = await db.query(
            'SELECT id FROM usuario WHERE email = ?', [email]
        );
        if (existente.length > 0) {
            return res.status(409).json({
                codigo: 409,
                estado: 'error',
                datos: 'El email ya está registrado.'
            });
        }

        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO usuario (nombre, apellido, email, password_hash) VALUES (?, ?, ?, ?)',
            [nombre.trim(), apellido.trim(), email.trim().toLowerCase(), hash]
        );

        return res.status(201).json({
            codigo: 201,
            estado: 'ok',
            datos: { id: result.insertId, nombre, apellido, email }
        });

    } catch (err) {
        console.error('registrar=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//4 — CU2: Iniciar sesion
async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            codigo: 400,
            estado: 'error',
            datos: 'Email y contraseña son obligatorios.'
        });
    }

    try {
        const [rows] = await db.query(
            'SELECT id, nombre, apellido, email, password_hash FROM usuario WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                codigo: 401,
                estado: 'error',
                datos: 'Credenciales incorrectas.'
            });
        }

        const usuario = rows[0];
        const match = await bcrypt.compare(password, usuario.password_hash);

        if (!match) {
            return res.status(401).json({
                codigo: 401,
                estado: 'error',
                datos: 'Credenciales incorrectas.'
            });
        }

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.status(200).json({
            codigo: 200,
            estado: 'ok',
            datos: {
                token,
                usuario: {
                    id:       usuario.id,
                    nombre:   usuario.nombre,
                    apellido: usuario.apellido,
                    email:    usuario.email
                }
            }
        });

    } catch (err) {
        console.error('login=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { registrar, login };
