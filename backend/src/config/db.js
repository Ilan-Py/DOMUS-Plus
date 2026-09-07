//Codigo por ILAN PITASHNY
//1 — Conexion a Postgres (Supabase) con pg usando pool de conexiones
const { Pool } = require('pg');
require('dotenv').config();

// DB_SSL=true habilita TLS (requerido por Supabase) — la base local en
// Docker (docker-compose.yml, imagen postgres oficial) no lo necesita.
// rejectUnauthorized:false no valida la cadena de certificados del server
// contra una CA conocida — el tráfico igual viaja cifrado (protege contra
// alguien leyendo la red pasivamente), pero no contra un servidor que se
// haga pasar activamente por Supabase (MITM). Alcanza para este proyecto;
// un endurecimiento real fijaría el certificado CA de Supabase explícito
// (ssl.ca) en vez de esto.
const useSsl = process.env.DB_SSL === 'true';

const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'domus_db',
    max:                     10,
    idleTimeoutMillis:       30000,
    connectionTimeoutMillis: 10000,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
});

//2 — Test de conexion al iniciar el servidor
pool.connect()
    .then(client => {
        console.log('Base de datos conectada correctamente.');
        client.release();
    })
    .catch(err => {
        console.error('Error al conectar con la base de datos:', err.message);
        process.exit(1);
    });

module.exports = pool;
