//Codigo por Claude
//1 — Rate limiting de subida de adjuntos. rate-limiter-flexible NO tiene una
// clase literalmente llamada "token bucket" — su algoritmo base (usado por
// RateLimiterMemory) es "Flexible Fixed Window" (ver su propio README), no
// bucket. La pieza que sí modela bucket real (asignación fija + ráfaga
// adicional que se reabastece con el tiempo) es BurstyRateLimiter: combina
// dos limiters — uno de régimen estable (`points`/`duration` normales) y uno
// de ráfaga aparte que sólo se consume cuando el estable ya se agotó. Eso es
// exactamente la semántica de "burst allowance + steady refill" que pide
// un token bucket, aunque cada limiter interno siga siendo fixed-window por
// dentro — se documenta así en vez de llamarlo "token bucket" sin más.
const { RateLimiterMemory, BurstyRateLimiter } = require('rate-limiter-flexible');

// Régimen estable: 10 subidas cada 5 minutos por usuario.
const limiterEstable = new RateLimiterMemory({
    keyPrefix: 'adjuntos-estable',
    points: 10,
    duration: 300,
});

// Ráfaga: 3 subidas extra permitidas cuando el estable ya se agotó,
// liberándose de a poco en una ventana de 20s — cubre el caso real de
// "subí varias fotos de golpe" sin abrir la puerta a un abuso sostenido.
const limiterRafaga = new RateLimiterMemory({
    keyPrefix: 'adjuntos-rafaga',
    points: 3,
    duration: 20,
});

const rateLimiterAdjuntos = new BurstyRateLimiter(limiterEstable, limiterRafaga);

//2 — Middleware Express. Sólo se aplica a la ruta de subida (POST), no a
// listar/eliminar — leer o borrar no es el recurso que hay que proteger acá.
async function limitarSubidaAdjuntos(req, res, next) {
    try {
        await rateLimiterAdjuntos.consume(String(req.usuario.id));
        next();
    } catch (rlRejected) {
        // BurstyRateLimiter (como el resto de la librería) rechaza con un
        // RateLimiterRes cuando el límite se alcanzó — cualquier otra cosa
        // (Error real) es una falla interna del limiter, no un 429 legítimo.
        if (rlRejected instanceof Error) {
            console.error('limitarSubidaAdjuntos=', rlRejected.message);
            return res.status(500).json({ codigo: 500, estado: 'error', datos: 'Error interno del servidor.' });
        }
        const segundos = Math.max(1, Math.ceil(rlRejected.msBeforeNext / 1000));
        res.set('Retry-After', String(segundos));
        return res.status(429).json({
            codigo: 429,
            estado: 'error',
            datos: `Demasiadas subidas. Probá de nuevo en ${segundos} segundos.`,
        });
    }
}

module.exports = { limitarSubidaAdjuntos };
