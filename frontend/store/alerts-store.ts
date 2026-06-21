import { create } from 'zustand';
import type { Alert, AlertListItem, AlertStatistics, RiskAssessmentCompleteEvent } from '@/types';
import { alertsApi, historyApi } from '@/lib/api-client';

interface AlertsState {
  alerts: AlertListItem[];
  activeAlert: Alert | null;
  statistics: AlertStatistics | null;
  isLoading: boolean;
  isFetchingAlert: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;

  // Real-time additions
  pendingAlerts: AlertListItem[];

  // Actions
  fetchAlerts: (page?: number) => Promise<void>;
  fetchAlert: (id: string) => Promise<void>;
  fetchStatistics: () => Promise<void>;
  addRealtimeAlert: (alert: AlertListItem) => void;
  updateAlertRisk: (event: RiskAssessmentCompleteEvent) => void;
  closeAlert: (alertId: string, note?: string) => Promise<void>;
  clearError: () => void;
}

export const useAlertsStore = create<AlertsState>()((set, get) => ({
  alerts: [],
  activeAlert: null,
  statistics: null,
  isLoading: false,
  isFetchingAlert: false,
  error: null,
  totalPages: 1,
  currentPage: 1,
  pendingAlerts: [],

  fetchAlerts: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const { data, pagination } = await alertsApi.list({ page, limit: 20, sort: '-timestamp' });
      set({
        alerts: data,
        currentPage: pagination.page,
        totalPages: pagination.pages,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load alerts';
      set({ error: message, isLoading: false });
    }
  },

  fetchAlert: async (id) => {
    set({ isFetchingAlert: true, error: null });
    try {
      const alert = await alertsApi.get(id);
      set({ activeAlert: alert, isFetchingAlert: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load alert';
      set({ error: message, isFetchingAlert: false });
    }
  },

  fetchStatistics: async () => {
    try {
      const statistics = await historyApi.getStatistics('month');
      set({ statistics });
    } catch {
      // Non-critical: fail silently
    }
  },

  addRealtimeAlert: (alert) => {
    set((state) => ({
      pendingAlerts: [alert, ...state.pendingAlerts],
      alerts: [alert, ...state.alerts],
    }));
  },

  updateAlertRisk: (event) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.alert_id === event.alert_id
          ? { ...a, risk_level: event.risk_level }
          : a
      ),
      activeAlert:
        state.activeAlert?.alert_id === event.alert_id
          ? {
              ...state.activeAlert,
              risk_assessment: {
                ...(state.activeAlert.risk_assessment ?? {
                  assessment_timestamp: new Date().toISOString(),
                  rationale: '',
                  suggested_actions: [],
                }),
                risk_level: event.risk_level,
                risk_score: event.risk_score,
                suggested_actions: event.suggested_actions,
              },
            }
          : state.activeAlert,
    }));
  },

  closeAlert: async (alertId, note) => {
    try {
      const updated = await alertsApi.update(alertId, {
        status: 'closed',
        resolution_note: note,
      });
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.alert_id === alertId ? { ...a, status: updated.status } : a
        ),
        activeAlert:
          state.activeAlert?.alert_id === alertId
            ? { ...state.activeAlert, status: updated.status }
            : state.activeAlert,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to close alert';
      set({ error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
