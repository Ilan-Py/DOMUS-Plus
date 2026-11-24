//Codigo por ILAN PITASHNY
//1 — Controlador de autenticacion (CU1 y CU2)
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { validarCampos } = require('../utils/validacion');

// Tipo y largo de cada campo (ERR-011). Los obligatorios se chequean en cada función.
const REGLAS_REGISTRO = {
    nombre:   { tipo: 'nombrePersona', max: 100 }, // ERR-008: sin números
    apellido: { tipo: 'nombrePersona', max: 100 },
    email:    { tipo: 'email', max: 150 },
    password: { tipo: 'texto', max: 72, etiqueta: 'contraseña' } // bcrypt ignora lo que pase de 72
};
const REGLAS_LOGIN  = { email: { tipo: 'texto', max: 150 }, password: { tipo: 'texto', max: 200, etiqueta: 'contraseña' } };
const REGLAS_PERFIL = { nombre: REGLAS_REGISTRO.nombre, apellido: REGLAS_REGISTRO.apellido, email: REGLAS_REGISTRO.email };
const REGLAS_PASSWORD = {
    passwordActual: { tipo: 'texto', max: 200, etiqueta: 'contraseña actual' },
    passwordNueva:  { tipo: 'texto', max: 72,  etiqueta: 'contraseña nueva' }
};

//2 — Validacion de formato de contrasena: min 8 caracteres, 1 mayuscula, 1 numero
function validarPassword(password) {
    return /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

//3 — CU1: Registrar usuario
async function registrar(req, res) {
    const { nombre, apellido, email, password } = req.body;

    const errorCampos = validarCampos(req.body, REGLAS_REGISTRO);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }

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
        const existente = await prisma.usuario.findUnique({
            where: { email }
        });
        if (existente) {
            return res.status(409).json({
                codigo: 409,
                estado: 'error',
                datos: 'El email ya está registrado.'
            });
        }

        const hash = await bcrypt.hash(password, 10);
        // RETURNING id — pg no tiene insertId como mysql2, hay que pedirlo
        // explícito en el INSERT.
          const nuevo = await prisma.usuario.create({
            data: { nombre: nombre.trim(), apellido: apellido.trim(), email: email.trim().toLowerCase(), passwordHash: hash }
        });

        return res.status(201).json({
            codigo: 201,
            estado: 'ok',
            datos: { id: nuevo.id, nombre, apellido, email }
        });

    } catch (err) {
        console.error('registrar=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//4 — CU2: Iniciar sesion
async function login(req, res) {
    const { email, password } = req.body;

    const errorCampos = validarCampos(req.body, REGLAS_LOGIN);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }

    if (!email || !password) {
        return res.status(400).json({
            codigo: 400,
            estado: 'error',
            datos: 'Email y contraseña son obligatorios.'
        });
    }

    try {
         const usuario = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });

        if (!usuario) {
            return res.status(401).json({ codigo: 401, estado: 'error', datos: 'Credenciales incorrectas.' });
        }

        const match = await bcrypt.compare(password, usuario.passwordHash);

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

//5 — Actualizar perfil (nombre/apellido/email)
async function actualizarPerfil(req, res) {
    const usuarioId = req.usuario.id;
    const { nombre, apellido, email } = req.body;

    const errorCampos = validarCampos(req.body, REGLAS_PERFIL);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }

    if (!nombre || !apellido || !email) {
        return res.status(400).json({
            codigo: 400,
            estado: 'error',
            datos: 'Todos los campos son obligatorios: nombre, apellido y email.'
        });
    }

    const emailNormalizado = email.trim().toLowerCase();

    try {
        // Busca otro usuario con ese email: NOT deja pasar el caso "no cambió el
        // email" sin tratarlo como colisión contra la propia fila del usuario.
        // findFirst y no findUnique: findUnique no acepta filtros como { not }
        // sobre el id y fallaba siempre con un 500.
        const enUso = await prisma.usuario.findFirst({
            where: { email: emailNormalizado, NOT: { id: usuarioId } }
        });
        if (enUso) {
            return res.status(409).json({
                codigo: 409,
                estado: 'error',
                datos: 'El email ya está registrado.'
            });
        }

        await prisma.usuario.update({
            where: { id: usuarioId },
            data: { nombre: nombre.trim(), apellido: apellido.trim(), email: emailNormalizado }
        });

        return res.status(200).json({
            codigo: 200,
            estado: 'ok',
            datos: { id: usuarioId, nombre: nombre.trim(), apellido: apellido.trim(), email: emailNormalizado }
        });

    } catch (err) {
        console.error('actualizarPerfil=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

//6 — Cambiar contraseña
async function cambiarPassword(req, res) {
    const usuarioId = req.usuario.id;
    const { passwordActual, passwordNueva } = req.body;

    const errorCampos = validarCampos(req.body, REGLAS_PASSWORD);
    if (errorCampos) {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: errorCampos });
    }

    if (!passwordActual || !passwordNueva) {
        return res.status(400).json({
            codigo: 400,
            estado: 'error',
            datos: 'La contraseña actual y la nueva son obligatorias.'
        });
    }

    try {
        const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
        if (!usuario) {
            return res.status(404).json({ codigo: 404, estado: 'error', datos: 'Usuario no encontrado.' });
        }

        const match = await bcrypt.compare(passwordActual, usuario.passwordHash);
        if (!match) {
            return res.status(401).json({
                codigo: 401,
                estado: 'error',
                datos: 'La contraseña actual es incorrecta.'
            });
        }

        if (!validarPassword(passwordNueva)) {
            return res.status(400).json({
                codigo: 400,
                estado: 'error',
                datos: 'La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número.'
            });
        }

        if (passwordNueva === passwordActual) {
            return res.status(400).json({
                codigo: 400,
                estado: 'error',
                datos: 'La nueva contraseña debe ser diferente a la actual.'
            });
        }

        const hash = await bcrypt.hash(passwordNueva, 10);
        await prisma.usuario.update({
            where: { id: usuarioId },
            data: { passwordHash: hash }
        });

        return res.status(200).json({ codigo: 200, estado: 'ok', datos: 'Contraseña actualizada.' });

    } catch (err) {
        console.error('cambiarPassword=', err.message);
        return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
    }
}

module.exports = { registrar, login, actualizarPerfil, cambiarPassword };
