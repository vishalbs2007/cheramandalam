const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { spawnSync } = require('child_process');
const pool = require('./config/db');
const routes = require('./routes');

dotenv.config();

const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

const parseEnvInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBool = (value, fallback) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const allowedOrigins = String(process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const ensureDatabaseInitialized = () => {
  if (String(process.env.AUTO_INIT_DB || 'true').toLowerCase() === 'false') {
    return true;
  }

  const initScript = path.join(__dirname, 'db', 'init.js');
  const result = spawnSync(process.execPath, [initScript], {
    env: process.env,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    console.error('Startup aborted: DB initialization failed');
    return false;
  }

  return true;
};

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

if (toBool(process.env.ENABLE_HTTP_LOGGING, !isProduction)) {
  app.use(morgan(isProduction ? 'combined' : 'dev'));
}

const apiLimiter = rateLimit({
  windowMs: parseEnvInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseEnvInt(process.env.API_RATE_LIMIT_MAX, 600),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: parseEnvInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseEnvInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' }
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_BODY_LIMIT || '1mb' }));

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    uptime_seconds: Math.floor(process.uptime())
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', message: 'Database unavailable' });
  }
});

app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    res.status(403).json({ message: 'CORS origin denied' });
    return;
  }

  console.error(err);
  res.status(500).json({
    message: isProduction ? 'Internal server error' : (err.message || 'Internal server error')
  });
});

const port = process.env.PORT || 5000;

if (!ensureDatabaseInitialized()) {
  process.exit(1);
}

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const shutdown = async () => {
  server.close(async () => {
    try {
      await pool.end();
    } catch (error) {
      console.error('Error while closing DB pool', error);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
