// =============================================================================
// LifeTap WebSocket Client
// Real-time alert updates with automatic reconnection
// =============================================================================

import type {
  AlertCreatedEvent,
  RiskAssessmentCompleteEvent,
  WebSocketEventType,
  WebSocketMessage,
} from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001';

type EventHandler<T = unknown> = (data: T) => void;

interface WebSocketHandlers {
  alert_created?: EventHandler<AlertCreatedEvent>;
  risk_assessment_complete?: EventHandler<RiskAssessmentCompleteEvent>;
  contact_response?: EventHandler<unknown>;
  device_status_changed?: EventHandler<unknown>;
  authenticated?: EventHandler<unknown>;
  heartbeat?: EventHandler<unknown>;
  error?: EventHandler<Error>;
  disconnect?: EventHandler<void>;
}

class LifeTapWebSocket {
  private ws: WebSocket | null = null;
  private handlers: WebSocketHandlers = {};
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalClose = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  connect(token: string): void {
    this.token = token;
    this.isIntentionalClose = false;
    this.reconnectAttempts = 0;
    this.initConnection();
  }

  disconnect(): void {
    this.isIntentionalClose = true;
    this.cleanup();
  }

  on<T extends WebSocketEventType>(
    event: T,
    handler: EventHandler<unknown>
  ): void {
    this.handlers[event] = handler as EventHandler<unknown>;
  }

  off(event: WebSocketEventType): void {
    delete this.handlers[event];
  }

  private initConnection(): void {
    if (typeof window === 'undefined') return;

    try {
      this.ws = new WebSocket(`${WS_URL}/ws`);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.authenticate();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event);
      };

      this.ws.onerror = () => {
        this.handlers.error?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.handlers.disconnect?.();

        if (!this.isIntentionalClose) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      this.handlers.error?.(error instanceof Error ? error : new Error('Failed to connect'));
    }
  }

  private authenticate(): void {
    if (!this.ws || !this.token) return;

    const authMessage: WebSocketMessage = {
      type: 'authenticate',
      data: { token: this.token },
    };

    this.ws.send(JSON.stringify(authMessage));
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data as string);

      switch (message.type) {
        case 'authenticated':
          this.handlers.authenticated?.(message.data);
          break;
        case 'alert_created':
          this.handlers.alert_created?.(message.data as AlertCreatedEvent);
          break;
        case 'risk_assessment_complete':
          this.handlers.risk_assessment_complete?.(message.data as RiskAssessmentCompleteEvent);
          break;
        case 'contact_response':
          this.handlers.contact_response?.(message.data);
          break;
        case 'device_status_changed':
          this.handlers.device_status_changed?.(message.data);
          break;
        case 'heartbeat':
          this.handlers.heartbeat?.(message.data);
          break;
        default:
          break;
      }
    } catch {
      // Silently ignore malformed messages
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.initConnection();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const wsClient = new LifeTapWebSocket();
