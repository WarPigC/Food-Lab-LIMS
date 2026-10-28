const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');

const { authLimiter, apiLimiter } = require('./middlewares/rateLimiter');
// Load env variables — .env.local overrides .env for local development
const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('Using LOCAL dev environment (.env.local)');
} else {
  dotenv.config();
}

// Logging
const { initMongoTransport, logError } = require('./utils/logger');
const requestLogger = require('./middlewares/requestLogger');

const app = express();
// Enable trust proxy because the application sits behind Caddy reverse proxy
app.set('trust proxy', 1);

const server = http.createServer(app);

const allowedOrigin = process.env.FRONTEND_URL;
if (!allowedOrigin) {
  console.warn('WARNING: FRONTEND_URL is not set in environment variables. Falling back to "*" for CORS. Do not use this in production!');
}
const corsOrigin = allowedOrigin || '*';
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Make io accessible globally via the request object
app.set('io', io);
const { setNotifierIo } = require('./utils/notifier');
setNotifierIo(io);

// Socket connection listener
io.on('connection', (socket) => {
  console.log('Client connected to WebSockets:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Security Middlewares: disable CSP and COEP in API helmet so SPA preview, websockets, and QR codes are not blocked
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logger: logs every HTTP request
app.use(requestLogger);

// Lightweight health check without auth or database operations
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Database and server readiness check
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbOk = dbState === 1;
  const payload = {
    status: dbOk ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    db: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };
  res.status(dbOk ? 200 : 503).json(payload);
});

// Routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/users', apiLimiter, require('./routes/userRoutes'));
app.use('/api/tests', apiLimiter, require('./routes/testRoutes'));
app.use('/api/jobs', apiLimiter, require('./routes/jobRoutes'));
app.use('/api/notifications', apiLimiter, require('./routes/notificationRoutes'));
app.use('/api/parameters', apiLimiter, require('./routes/parameterRoutes'));
app.use('/api/parameter-groups', apiLimiter, require('./routes/parameterGroupRoutes'));
app.use('/api/sample-transfers', apiLimiter, require('./routes/sampleTransferRoutes'));
app.use('/api/bug-reports', apiLimiter, require('./routes/bugReportRoutes'));
app.use('/api/data-settings', apiLimiter, require('./routes/dataSettingsRoutes'));
app.use('/api/test-methods', apiLimiter, require('./routes/testMethodRoutes'));
app.use('/api/units', apiLimiter, require('./routes/unitRoutes'));
app.use('/api/special-profiles', apiLimiter, require('./routes/specialProfileRoutes'));
app.use('/api/export', apiLimiter, require('./routes/exportRoutes'));
app.use('/api/logs', apiLimiter, require('./routes/logRoutes'));

// Connect to MongoDB using MONGODB_URI or MONGO_URI
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
mongoose.connect(mongoUri)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    // Initialize MongoDB logging transport now that DB is connected
    initMongoTransport();
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      // Drop legacy unique index on sampleSerial if it exists (allows retests to share serial)
      mongoose.connection.db.collection('jobs').dropIndex('sampleSerial_1').catch(() => { });
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Graceful shutdown handling for container termination
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Global error handlers
process.on('unhandledRejection', (reason) => {
  logError('UNHANDLED_REJECTION', {
    message: `Unhandled Promise Rejection: ${reason?.message || reason}`,
    error: {
      name: reason?.name || 'UnhandledRejection',
      message: reason?.message || String(reason),
      stack: reason?.stack
    }
  });
});

process.on('uncaughtException', (err) => {
  logError('UNCAUGHT_EXCEPTION', {
    message: `Uncaught Exception: ${err.message}`,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    }
  });
  // Give logger time to flush, then exit
  setTimeout(() => process.exit(1), 1000);
});

module.exports = app;
