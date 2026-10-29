require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_enterprise_jwt_key_plastix_9988771122',
  cookieSecret: process.env.COOKIE_SECRET || 'super_secret_cookie_vault_key_2026_factory',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plastix_factory',
  isProduction: process.env.NODE_ENV === 'production'
};
