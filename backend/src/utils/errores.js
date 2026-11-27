//1 — Red de seguridad para errores no capturados (ERR-011)
// Express 4 no captura los errores de los handlers async: si algo falla
// fuera del try (ej. nombre.trim() cuando nombre es un número), la promesa
// queda rechazada sin manejar y Node corta el proceso — el servidor se cae
// para todos. Esto envuelve cada handler de un router para que cualquier
// error termine en el manejador de abajo, como un 500 con el formato de la API.

function envolverAsync(handler) {
    if (handler.length === 4) return handler; // ya es un manejador de errores
    return function (req, res, next) {
        try {
            const resultado = handler(req, res, next);
            if (resultado && typeof resultado.catch === 'function') resultado.catch(next);
        } catch (err) {
            next(err);
        }
    };
}

// Recorre las rutas ya definidas en el router y envuelve sus handlers.
// Se llama una vez por router en app.js, después de requerirlo.
function capturarErroresAsync(router) {
    for (const capa of router.stack) {
        if (capa.route) {
            for (const capaRuta of capa.route.stack) capaRuta.handle = envolverAsync(capaRuta.handle);
        }
    }
    return router;
}

//2 — Manejador final: JSON mal formado → 400; cualquier otra cosa → 500.
// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ codigo: 400, estado: 'error', datos: 'El cuerpo de la solicitud no es un JSON válido.' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ codigo: 413, estado: 'error', datos: 'La solicitud es demasiado grande.' });
    }
    console.error(`${req.method} ${req.originalUrl}=`, err.message);
    return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
}

module.exports = { capturarErroresAsync, manejarErrores };
