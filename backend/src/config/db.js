//Codigo por ILAN PITASHNY
//1 — Conexion a MySQL con mysql2 usando pool de conexiones
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'domus_db',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
});

//2 — Test de conexion al iniciar el servidor
pool.getConnection()
    .then(conn => {
        console.log('Base de datos conectada correctamente.');
        conn.release();
    })
    .catch(err => {
        console.error('Error al conectar con la base de datos:', err.message);
        process.exit(1);
    });

module.exports = pool;
