// backend/src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import aiRoutes from './routes/ai.routes.js';
import quoteRoutes from './routes/quote.routes.js';
import pricingRoutes from './routes/pricing.routes.js';
import usersRoutes from './routes/users.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(__dirname, '../../frontend');

const app = express();

// ── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));
const corsOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
});
app.use('/api/', limiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  message: { error: 'Limite de requêtes IA atteinte. Attendez 1 minute.' },
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/users', usersRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Frontend (même domaine) ──────────────────────────────────────────────────
app.use(express.static(FRONTEND_DIR, { index: 'index.html' }));

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`🚀 DevisPro running on port ${PORT}`));

export default app;
