/**
 * WebSocket Server
 * Manages real-time client connections with JWT authentication.
 * Supports broadcasting to individual users and all connected clients.
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { JwtPayload, WsMessage, WsEventType } from '../types';

interface AuthenticatedClient extends WebSocket {
  userId?: string;
  isAlive: boolean;
}

class LifeTapWsServer {
  private wss: WebSocketServer | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private clients: Map<string, Set<AuthenticatedClient>> = new Map();

  /**
   * Attaches the WebSocket server to an existing HTTP server.
   */
  attach(server: import('http').Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedClient, req: IncomingMessage) => {
      const clientIp = req.socket.remoteAddress ?? 'unknown';
      ws.isAlive = true;

      logger.debug({ ip: clientIp }, 'WebSocket client connected (not yet authenticated)');

      ws.on('message', (rawData: Buffer) => {
        this.handleMessage(ws, rawData);
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        this.removeClient(ws);
        logger.debug({ userId: ws.userId }, 'WebSocket client disconnected');
      });

      ws.on('error', (err) => {
        logger.error({ err, userId: ws.userId }, 'WebSocket client error');
      });

      // Send a welcome ping — client must authenticate within 10 seconds
      setTimeout(() => {
        if (!ws.userId) {
          ws.terminate();
          logger.warn({ ip: clientIp }, 'WebSocket unauthenticated client terminated');
        }
      }, 10000);
    });

    // Start keep-alive ping interval
    this.heartbeatInterval = setInterval(() => {
      this.pingClients();
    }, 30000);

    logger.info('WebSocket server initialized');
  }

  private handleMessage(ws: AuthenticatedClient, rawData: Buffer): void {
    try {
      const message = JSON.parse(rawData.toString()) as WsMessage<{ token?: string }>;

      if (message.type === 'authenticate') {
        this.handleAuthentication(ws, message);
        return;
      }

      if (!ws.userId) {
        this.sendToClient(ws, {
          type: 'error',
          data: { message: 'Authentication required' },
        });
        return;
      }

      // Additional message types can be handled here
      logger.debug({ type: message.type, userId: ws.userId }, 'WebSocket message received');
    } catch {
      logger.warn('Received malformed WebSocket message');
    }
  }

  private handleAuthentication(
    ws: AuthenticatedClient,
    message: WsMessage<{ token?: string }>,
  ): void {
    const token = message.data?.token;
    if (!token) {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Token is required for authentication' },
      });
      return;
    }

    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      ws.userId = payload.sub;
      this.addClient(ws);

      this.sendToClient(ws, {
        type: 'authenticated',
        data: {
          user_id: payload.sub,
          authenticated_at: new Date().toISOString(),
        },
      });

      logger.info({ userId: payload.sub }, 'WebSocket client authenticated');
    } catch {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Invalid or expired token' },
      });
    }
  }

  private addClient(ws: AuthenticatedClient): void {
    if (!ws.userId) return;
    if (!this.clients.has(ws.userId)) {
      this.clients.set(ws.userId, new Set());
    }
    this.clients.get(ws.userId)?.add(ws);
  }

  private removeClient(ws: AuthenticatedClient): void {
    if (!ws.userId) return;
    this.clients.get(ws.userId)?.delete(ws);
    if (this.clients.get(ws.userId)?.size === 0) {
      this.clients.delete(ws.userId);
    }
  }

  private sendToClient(ws: WebSocket, message: WsMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private pingClients(): void {
    const deadClients: AuthenticatedClient[] = [];

    this.wss?.clients.forEach((rawWs) => {
      const ws = rawWs as AuthenticatedClient;
      if (!ws.isAlive) {
        deadClients.push(ws);
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });

    // Terminate dead connections
    deadClients.forEach((ws) => {
      this.removeClient(ws);
      ws.terminate();
    });

    // Broadcast server heartbeat to authenticated clients
    this.broadcast({
      type: 'heartbeat',
      data: { server_timestamp: new Date().toISOString() },
    });
  }

  /**
   * Broadcasts a message to all authenticated connections of a specific user.
   */
  broadcastToUser(userId: string, message: WsMessage): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const payload = JSON.stringify(message);
    userClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * Broadcasts a message to all currently authenticated connections.
   */
  broadcast(message: WsMessage): void {
    if (!this.wss) return;
    const payload = JSON.stringify(message);

    this.wss.clients.forEach((rawWs) => {
      const ws = rawWs as AuthenticatedClient;
      if (ws.readyState === WebSocket.OPEN && ws.userId) {
        ws.send(payload);
      }
    });
  }

  /**
   * Returns the count of currently connected, authenticated clients.
   */
  getConnectedClientCount(): number {
    let count = 0;
    this.clients.forEach((set) => (count += set.size));
    return count;
  }

  /**
   * Gracefully shuts down the WebSocket server.
   */
  async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    return new Promise((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }
      this.wss.close(() => {
        logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}

// Singleton export — used by job processors and routes
export const wsServer = new LifeTapWsServer();
