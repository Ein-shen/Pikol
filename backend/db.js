
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// =====================================================
// DATABASE CONFIGURATION
// =====================================================
const baseConfig = process.env.DATABASE_URL
    ? {
          connectionString: process.env.DATABASE_URL,
      }
    : {
          host: process.env.DB_HOST || "localhost",
          port: Number(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
      };

// =====================================================
// DATABASE CONNECTION DEBUG
// =====================================================
console.log(
    "DATABASE_URL present:",
    Boolean(process.env.DATABASE_URL)
);

try {
    console.log(
        "Connecting to host:",
        process.env.DATABASE_URL
            ? new URL(process.env.DATABASE_URL).host
            : process.env.DB_HOST || "localhost"
    );
} catch {
    console.error(
        "DATABASE_URL could not be parsed. Check your connection string."
    );
}

// =====================================================
// POSTGRESQL POOL
// =====================================================
const pool = new Pool({
    ...baseConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

// =====================================================
// CONNECTION EVENTS
// =====================================================
pool.on("connect", () => {
    console.log("PostgreSQL: connected");
});

pool.on("acquire", () => {
    console.log("PostgreSQL: connection acquired");
});

pool.on("remove", () => {
    console.log("PostgreSQL: connection removed");
});

pool.on("error", (error) => {
    console.error("PostgreSQL pool error:", error);
});

export default pool;
