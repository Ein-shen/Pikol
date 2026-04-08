import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    // Connection settings
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,

    // Helps keep TCP connections alive
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

pool.on('connect', () => {
    console.log('PostgreSQL: connected');
});

pool.on('acquire', () => {
    console.log('PostgreSQL: connection acquired');
});

pool.on('remove', () => {
    console.log('PostgreSQL: connection removed');
});

pool.on('error', (error) => {
    console.error('PostgreSQL pool error:', error);
});

export default pool;