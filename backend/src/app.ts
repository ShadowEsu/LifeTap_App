import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { requestId } from './middleware/requestId';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/auth';
import alertRoutes from './routes/alerts';
import contactRoutes from './routes/contacts';
import hardwareRoutes from './routes/hardware';
import historyRoutes from './routes/history';
import healthRoutes from './routes/health';
import whatsappRoutes from './routes/whatsapp';

export function createApp(): Application {
  const app = express();

  app.use(helmet({ crossOriginEmbedderPolicy: false }));

  app.use(
    cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true);
        return callback(null, true);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestId);

  if (config.NODE_ENV !== 'test') {
    app.use(
      morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev', {
        stream: { write: (message: string) => logger.info(message.trim()) },
      }),
    );
  }

  if (config.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use('/', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/alerts', alertRoutes);
  app.use('/api/v1/contacts', contactRoutes);
  app.use('/api/v1/hardware', hardwareRoutes);
  app.use('/api/v1/history', historyRoutes);
  app.use('/api/v1/whatsapp', whatsappRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
