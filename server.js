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

// 1. Initialize Real-Time WebSockets
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
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
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
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
