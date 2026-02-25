import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import entryRoutes from './routes/entries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5001;
const isVercel = Boolean(process.env.VERCEL);
let dbConnectPromise = null;

const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const allowedOrigins = new Set(['http://localhost:3000', 'http://localhost:5173', ...configuredOrigins]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;

  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function ensureDbConnection() {
  if (!dbConnectPromise) {
    dbConnectPromise = connectDB().catch((error) => {
      dbConnectPromise = null;
      throw error;
    });
  }
  return dbConnectPromise;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(express.json());

if (isVercel) {
  app.use(async (req, res, next) => {
    if (req.path === '/api/health' || req.path === '/api/heartbeat') return next();

    try {
      await ensureDbConnection();
      next();
    } catch (error) {
      console.error('DB connection failed:', error);
      res.status(500).json({ message: 'Database connection failed.' });
    }
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/heartbeat', (_req, res) => {
  res.status(200).json({
    ok: true,
    status: 'alive',
    service: 'sickness-tracker-api',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/entries', entryRoutes);

if (!isVercel) {
  ensureDbConnection()
    .then(() => {
      app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error('DB connection failed:', error);
      process.exit(1);
    });
}

export default app;
