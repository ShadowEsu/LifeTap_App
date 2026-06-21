/**
 * Structured JSON logger using Pino.
 * In development, output is pretty-printed. In production, raw JSON.
 * Each log entry includes a request ID when available.
 */

import pino from 'pino';

const isDevelopment = (process.env['NODE_ENV'] ?? 'development') === 'development';
const logJson = process.env['LOG_JSON'] === 'true';
const logLevel = process.env['LOG_LEVEL'] ?? 'info';

export const logger = pino({
  level: logLevel,
  ...(isDevelopment && !logJson
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  base: {
    pid: process.pid,
    service: 'lifechain-backend',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

export type Logger = typeof logger;
