import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server as HTTPServer } from 'http';
import { WebSocketServer } from 'ws';

import { config } from './config/env';
import { logger } from './config/logger';
import alertRoutes from './routes/alerts';
import authRoutes from './routes/auth';
import contactRoutes from './routes/contacts';
import hardwareRoutes from './routes/hardware';
import historyRoutes from './routes/history';
import { errorHandler } from './middleware/errorHandler';
import { startJobProcessors } from './jobs/processors';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg) } }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/hardware', hardwareRoutes);
app.use('/api/v1/history', historyRoutes);

// Health checks
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'live' });
});

app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready', database: 'connected', redis: 'connected' });
});

// Error handler
app.use(errorHandler);

// Create HTTP server
const server: HTTPServer = express().listen(config.PORT, config.API_HOST, () => {
  logger.info(`Backend API running on http://${config.API_HOST}:${config.PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      logger.info('WebSocket client connected');
      
      ws.on('message', (data) => {
        logger.debug(`WebSocket message: ${data}`);
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error: ${error.message}`);
      });
    });
  } else {
    socket.destroy();
  }
});

// Start job processors
startJobProcessors();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export { server, wss };
