// ============================================================
// LifeTap Backend - Shared Type Definitions
// ============================================================

// ---- Domain Enums ------------------------------------------

export enum AlertStatus {
  RECEIVED = 'received',
  ASSESSING = 'assessing',
  NOTIFIED = 'notified',
  ACKNOWLEDGED = 'acknowledged',
  CLOSED = 'closed',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum NotificationPreference {
  ALWAYS = 'always',
  HIGH_RISK_ONLY = 'high_risk_only',
  NEVER = 'never',
}

export enum ContactResponseStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  EN_ROUTE = 'en_route',
  EMERGENCY_SERVICES_CALLED = 'emergency_services_called',
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  DEGRADED = 'degraded',
}

export enum HardwareErrorType {
  ARDUINO_DISCONNECTED = 'arduino_disconnected',
  GPS_FAILURE = 'gps_failure',
  NETWORK_ERROR = 'network_error',
  SERIAL_OVERFLOW = 'serial_overflow',
}

// ---- Location -----------------------------------------------

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Location extends Coordinates {
  accuracy_meters?: number;
  address?: string;
  altitude_meters?: number;
  satellites_used?: number;
  hdop?: number;
}

// ---- User ---------------------------------------------------

export interface User {
  user_id: string;
  email: string;
  name: string;
  phone?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  user_id: string;
  email: string;
  name: string;
  phone?: string;
  created_at: Date;
}

// ---- Emergency Contact --------------------------------------

export interface EmergencyContact {
  contact_id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_active: boolean;
  notification_preference: NotificationPreference;
  verified: boolean;
  verified_at?: Date;
  verification_code?: string;
  total_alerts_notified: number;
  total_responses: number;
  created_at: Date;
  updated_at: Date;
}

// ---- Risk Assessment ----------------------------------------

export interface RiskAssessment {
  risk_level: RiskLevel;
  risk_score: number;
  assessment_timestamp: Date;
  rationale: string;
  suggested_actions: string[];
  escalation_criteria?: {
    trigger_emergency_services: string;
    escalation_threshold: number;
  };
}

// ---- Alert --------------------------------------------------

export interface Alert {
  alert_id: string;
  user_id: string;
  device_id: string;
  device_name?: string;
  status: AlertStatus;
  timestamp: Date;
  location: Location;
  location_status: 'real-time' | 'cached' | 'unknown';
  risk_assessment?: RiskAssessment;
  resolution?: AlertResolution;
  created_at: Date;
  updated_at: Date;
}

export interface AlertResolution {
  status: string;
  resolved_at: Date;
  resolved_by: 'user' | 'contact' | 'system';
  resolution_note?: string;
}

export interface AlertContactResponse {
  contact_id: string;
  name: string;
  phone: string;
  relationship: string;
  sms_sent_at?: Date;
  response_status: ContactResponseStatus;
  response_message?: string;
  response_timestamp?: Date;
}

// ---- Hardware Device ----------------------------------------

export interface HardwareDevice {
  device_id: string;
  user_id: string;
  device_serial: string;
  device_name: string;
  device_type: string;
  location: string;
  secret_token_hash: string;
  status: DeviceStatus;
  last_heartbeat_at?: Date;
  firmware_version?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SystemStatus {
  cpu_temp_c?: number;
  memory_available_mb?: number;
  wifi_signal_strength?: number;
  gps_status?: string;
  arduino_connected?: boolean;
}

// ---- API Request/Response helpers ---------------------------

export interface ApiSuccessResponse<T = unknown> {
  status: 'success';
  data: T;
  meta: ResponseMeta;
}

export interface ApiErrorResponse {
  status: 'error';
  data: null;
  error: ApiError;
  meta: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  timestamp: string;
  request_id: string;
  pagination?: PaginationMeta;
  total?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_previous: boolean;
  next_page_url: string | null;
  previous_page_url: string | null;
}

export interface PaginationQuery {
  page: number;
  limit: number;
  sort?: string;
}

// ---- JWT Payload --------------------------------------------

export interface JwtPayload {
  sub: string; // user_id
  email: string;
  iat?: number;
  exp?: number;
  type: 'access' | 'refresh';
}

export interface DeviceJwtPayload {
  sub: string; // device_id
  user_id: string;
  iat?: number;
  exp?: number;
  type: 'device';
}

// ---- WebSocket Events ---------------------------------------

export type WsEventType =
  | 'authenticate'
  | 'authenticated'
  | 'alert_created'
  | 'risk_assessment_complete'
  | 'contact_response'
  | 'device_status_changed'
  | 'heartbeat'
  | 'error';

export interface WsMessage<T = unknown> {
  type: WsEventType;
  data: T;
}

// ---- Express augmentation -----------------------------------

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: JwtPayload;
      device?: DeviceJwtPayload;
    }
  }
}
