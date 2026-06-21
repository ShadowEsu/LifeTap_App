// =============================================================================
// LifeTap Type Definitions
// Mirrors the API_SPEC.md contracts
// =============================================================================

// --- Auth ---

export interface User {
  user_id: string;
  email: string;
  name: string;
  phone?: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: User;
}

// --- Location ---

export interface Location {
  lat: number;
  lon: number;
  accuracy_meters?: number;
  address?: string;
}

// --- Risk Assessment ---

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskAssessment {
  risk_level: RiskLevel;
  risk_score: number;
  assessment_timestamp: string;
  rationale: string;
  suggested_actions: string[];
  escalation_criteria?: {
    trigger_emergency_services: string;
    escalation_threshold: number;
  };
}

// --- Alert ---

export type AlertStatus = 'received' | 'acknowledged' | 'closed';

export interface ContactResponse {
  contact_id: string;
  name: string;
  phone: string;
  relationship: string;
  sms_sent_at: string;
  response_status: 'pending' | 'acknowledged' | 'en_route' | 'services_called';
  response_message: string | null;
  response_timestamp: string | null;
}

export interface AlertResolution {
  status: 'closed';
  resolved_at: string;
  resolved_by: 'user' | 'contact' | 'system';
  resolution_note: string;
}

export interface Alert {
  alert_id: string;
  user_id: string;
  device_id: string;
  device_name?: string;
  status: AlertStatus;
  timestamp: string;
  location: Location;
  risk_assessment?: RiskAssessment;
  contacts?: ContactResponse[];
  resolution?: AlertResolution;
  contact_responses?: number;
  response_status?: string;
  created_at: string;
  updated_at?: string;
}

export interface AlertListItem {
  alert_id: string;
  timestamp: string;
  status: AlertStatus;
  risk_level?: RiskLevel;
  location: Location;
  contact_responses: number;
  response_status?: string;
}

export interface AlertFilters {
  page?: number;
  limit?: number;
  sort?: string;
  status?: AlertStatus[];
  start_date?: string;
  end_date?: string;
  risk_level?: RiskLevel[];
  location_radius?: number;
}

// --- Emergency Contacts ---

export type NotificationPreference = 'always' | 'high_risk_only' | 'medium_high_risk' | 'never';

export interface EmergencyContact {
  contact_id: string;
  user_id?: string;
  name: string;
  phone: string;
  relationship: string;
  is_active: boolean;
  notification_preference: NotificationPreference;
  verified: boolean;
  verified_at?: string;
  total_alerts_notified?: number;
  total_responses?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateContactRequest {
  name: string;
  phone: string;
  relationship: string;
  is_active: boolean;
  notification_preference: NotificationPreference;
}

export interface UpdateContactRequest {
  name?: string;
  phone?: string;
  relationship?: string;
  is_active?: boolean;
  notification_preference?: NotificationPreference;
}

// --- Statistics ---

export interface AlertStatistics {
  period: string;
  total_alerts: number;
  alert_breakdown: {
    high_risk: number;
    medium_risk: number;
    low_risk: number;
  };
  average_response_time: number;
  response_rate: number;
  false_alarm_rate: number;
  by_device: Array<{
    device_id: string;
    device_name: string;
    alerts: number;
  }>;
}

// --- API Response Wrappers ---

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T | null;
  meta?: {
    timestamp: string;
    request_id: string;
    pagination?: Pagination;
    total?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_previous: boolean;
  next_page_url?: string | null;
  previous_page_url?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// --- WebSocket Events ---

export type WebSocketEventType =
  | 'authenticate'
  | 'authenticated'
  | 'alert_created'
  | 'risk_assessment_complete'
  | 'contact_response'
  | 'device_status_changed'
  | 'heartbeat';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  data: T;
}

export interface AlertCreatedEvent {
  alert_id: string;
  user_id: string;
  device_id: string;
  timestamp: string;
  location: Location;
  status: AlertStatus;
}

export interface RiskAssessmentCompleteEvent {
  alert_id: string;
  risk_level: RiskLevel;
  risk_score: number;
  suggested_actions: string[];
}

// --- AI Agent ---

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

// --- Hardware / Device ---

export interface Device {
  device_id: string;
  device_name: string;
  device_type: string;
  location: string;
  status: 'online' | 'offline' | 'unknown';
  last_heartbeat?: string;
}
