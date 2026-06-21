/**
 * Express application factory.
 * Separated from server startup to allow clean testing without
 * binding to a real port.
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
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

  // ---- Security Middleware --------------------------------
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: config.server.isProduction,
    }),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, Raspberry Pi)
        if (!origin) return callback(null, true);
        if (config.cors.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`CORS: Origin '${origin}' is not allowed`));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      credentials: true,
      maxAge: 86400,
    }),
  );

  // ---- Core Middleware ------------------------------------
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestId);

  // ---- HTTP Logging ---------------------------------------
  if (!config.server.isTest) {
    app.use(
      morgan(config.server.isProduction ? 'combined' : 'dev', {
        stream: {
          write: (message: string) => {
            logger.info({ msg: message.trim() }, 'HTTP');
          },
        },
        skip: (_req, res) => res.statusCode < 400 && config.server.isProduction,
      }),
    );
  }

  // ---- Trust Proxy ----------------------------------------
  // Enable if deployed behind a reverse proxy (AWS ALB, Nginx)
  if (config.server.isProduction) {
    app.set('trust proxy', 1);
  }

  // ---- Health Check (no version prefix) -------------------
  app.use('/', healthRoutes);

  // ---- Versioned API Routes -------------------------------
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/alerts', alertRoutes);
  app.use('/api/v1/contacts', contactRoutes);
  app.use('/api/v1/hardware', hardwareRoutes);
  app.use('/api/v1/history', historyRoutes);
  app.use('/api/v1/whatsapp', whatsappRoutes);

  // ---- 404 Handler ----------------------------------------
  app.use(notFoundHandler);

  // ---- Global Error Handler (must be last) ----------------
  app.use(errorHandler);

  return app;
}
