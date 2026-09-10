import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import { config } from './config.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admins.routes.js';
import quizRoutes from './routes/quizzes.routes.js';
import questionRoutes from './routes/questions.routes.js';
import uploadRoutes from './routes/uploads.routes.js';
import playRoutes from './routes/play.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  if (config.corsOrigin.length > 0) {
    app.use(cors({ origin: config.corsOrigin, credentials: false }));
  }

  fs.mkdirSync(config.uploadDir, { recursive: true });
  app.use(
    '/uploads',
    express.static(config.uploadDir, {
      maxAge: '7d',
      immutable: true,
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/admins', adminRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api/questions', questionRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/play', playRoutes);

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
