import { useEffect, useCallback } from 'react';
import { useAlertsStore } from '@/store/alerts-store';
import { useAuthStore } from '@/store/auth-store';
import { wsClient } from '@/lib/websocket';
import { getAccessToken } from '@/lib/auth';
import type { AlertCreatedEvent, RiskAssessmentCompleteEvent } from '@/types';

export function useAlerts() {
  const {
    alerts,
    isLoading,
    error,
    totalPages,
    currentPage,
    fetchAlerts,
    addRealtimeAlert,
    updateAlertRisk,
    closeAlert,
    clearError,
  } = useAlertsStore();

  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAlerts(1);
  }, [isAuthenticated, fetchAlerts]);

  // Setup WebSocket listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = getAccessToken();
    if (!token) return;

    wsClient.on('alert_created', (data) => {
      const event = data as AlertCreatedEvent;
      addRealtimeAlert({
        alert_id: event.alert_id,
        timestamp: event.timestamp,
        status: event.status,
        location: event.location,
        contact_responses: 0,
      });
    });

    wsClient.on('risk_assessment_complete', (data) => {
      updateAlertRisk(data as RiskAssessmentCompleteEvent);
    });

    if (!wsClient.isConnected) {
      wsClient.connect(token);
    }

    return () => {
      wsClient.off('alert_created');
      wsClient.off('risk_assessment_complete');
    };
  }, [isAuthenticated, addRealtimeAlert, updateAlertRisk]);

  const loadPage = useCallback(
    (page: number) => {
      fetchAlerts(page);
    },
    [fetchAlerts]
  );

  return { alerts, isLoading, error, totalPages, currentPage, loadPage, closeAlert, clearError };
}

export function useAlert(alertId: string | null) {
  const { activeAlert, isFetchingAlert, error, fetchAlert } = useAlertsStore();

  useEffect(() => {
    if (!alertId) return;
    fetchAlert(alertId);
  }, [alertId, fetchAlert]);

  return { alert: activeAlert, isLoading: isFetchingAlert, error };
}

export function useAlertStatistics() {
  const { statistics, fetchStatistics } = useAlertsStore();

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return { statistics };
}
