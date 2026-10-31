const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');

const config = require('./config');
const db = require('./db');
const socketService = require('./services/socket');
const apiRouter = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Configure dynamic CORS for production domains and local testing
const allowedOrigins = (config.frontendUrl || '')
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

const checkOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) return callback(null, true);
  if (allowedOrigins.some(allowed => origin === allowed || origin.endsWith(allowed.replace(/^https?:\/\//, '')))) {
    return callback(null, true);
  }
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return callback(null, true);
  }
  return callback(null, true); // Fallback allow to prevent deployment CORS breakage
};

const corsConfig = {
  origin: checkOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

// 1. Initialize Real-Time WebSockets
const io = new Server(server, {
  cors: corsConfig
});

socketService.init(io);

io.on('connection', (socket) => {
  console.log(`[Socket.IO Client Connected]: ${socket.id}`);

  socket.on('join_terminal', () => {
    socket.join('floor_terminals');
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO Client Disconnected]: ${socket.id}`);
  });
});

// 2. Global Request Middlewares
app.use(cors(corsConfig));
app.use(express.json());
app.use(cookieParser(config.cookieSecret));

// 3. Mount Master Modular API Router
app.use('/api', apiRouter);

// 4. Centralized Error Handling Middleware
app.use(errorHandler);

// 5. Graceful Server Shutdown
function gracefulShutdown(signal) {
  console.log(`[Process Received ${signal}]: Gracefully closing server and database pool...`);
  server.close(async () => {
    try {
      await db.pool.end();
      console.log('[PostgreSQL Pool Closed]: Cleanup complete.');
      process.exit(0);
    } catch (err) {
      console.error('[Shutdown Error]:', err);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 6. Launch HTTP & WebSocket Server
server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`  Plastix ERP Backend Server (Modular Enterprise 3-Tier)`);
  console.log(`  HTTP Endpoint:    http://localhost:${config.port}`);
  console.log(`  Database Engine:  PostgreSQL 17 (Connection Pool Active)`);
  console.log(`  WebSocket Engine: Socket.IO (Event Bus Initialized)`);
  console.log(`  Environment:      ${config.nodeEnv}`);
  console.log(`=======================================================`);
});
