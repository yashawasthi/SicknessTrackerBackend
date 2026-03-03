import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import entryRoutes from './routes/entries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5001;
let dbConnectPromise = null;

function ensureDbConnection() {
  if (!dbConnectPromise) {
    dbConnectPromise = connectDB().catch((error) => {
      dbConnectPromise = null;
      throw error;
    });
  }
  return dbConnectPromise;
}

// allow requests from any origin (disable origin filtering)
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json());

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

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
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
