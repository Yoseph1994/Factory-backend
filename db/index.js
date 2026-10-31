const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plastix_factory';

// Detect whether SSL is needed (cloud postgres, Neon, Supabase, or explicit SSL flag)
const isRemoteOrSsl = connectionString.includes('sslmode=require') ||
  process.env.DB_SSL === 'true' ||
  (!connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'));

const pool = new Pool({
  connectionString,
  ssl: isRemoteOrSsl ? { rejectUnauthorized: false } : false,
  max: 5, // Lean pool limit for shared/cPanel hosting to conserve processes (NPROC)
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
