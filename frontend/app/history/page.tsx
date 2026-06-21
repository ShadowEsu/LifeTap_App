'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { isAuthenticated } from '@/lib/auth';
import { alertsAPI, historyAPI } from '@/lib/api-client';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import { format } from 'date-fns';

interface Alert {
  id: string;
  timestamp: string;
  lat: number;
  lon: number;
  address?: string;
  risk_level?: string;
  status: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const [alertsRes, statsRes] = await Promise.all([
        alertsAPI.getAll(),
        historyAPI.getStats(),
      ]);
      setAlerts(alertsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await historyAPI.get();
      const data = response.data;
      
      const content = format === 'csv' 
        ? convertToCSV(data)
        : JSON.stringify(data, null, 2);
      
      const element = document.createElement('a');
      element.setAttribute('href', `data:text/${format === 'csv' ? 'csv' : 'json'};charset=utf-8,${encodeURIComponent(content)}`);
      element.setAttribute('download', `lifetap-history.${format}`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const convertToCSV = (data: any) => {
    const headers = ['Timestamp', 'Location', 'Risk Level', 'Status'];
    const rows = (Array.isArray(data) ? data : []).map((alert) => [
      format(new Date(alert.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      alert.address || `${alert.lat.toFixed(4)}, ${alert.lon.toFixed(4)}`,
      alert.risk_level || 'N/A',
      alert.status,
    ]);
    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  };

  return (
    <div className="flex h-screen bg-gradient-subtle">
      <Navigation />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Alert History</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  className="btn btn-secondary"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="btn btn-secondary"
                >
                  Export JSON
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="card text-center">
                  <div className="text-3xl font-bold gradient-text">{stats.total_alerts || 0}</div>
                  <div className="text-gray-600">Total Alerts</div>
                </div>
                <div className="card text-center">
                  <div className="text-3xl font-bold text-blue-500">
                    {stats.avg_risk_level || 'N/A'}
                  </div>
                  <div className="text-gray-600">Average Risk</div>
                </div>
                <div className="card text-center">
                  <div className="text-3xl font-bold text-purple-500">
                    {stats.verified_contacts || 0}
                  </div>
                  <div className="text-gray-600">Verified Contacts</div>
                </div>
              </div>
            )}

            {/* Alerts List */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Alerts Timeline</h2>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No alerts yet</div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {format(new Date(alert.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                        </div>
                        <div className="text-sm text-gray-600">
                          {alert.address || `${alert.lat.toFixed(4)}, ${alert.lon.toFixed(4)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {alert.risk_level && (
                          <span className={`badge badge-${alert.risk_level}`}>
                            {alert.risk_level.toUpperCase()}
                          </span>
                        )}
                        <span className={`badge ${
                          alert.status === 'notified' 
                            ? 'badge-low' 
                            : alert.status === 'received'
                            ? 'badge-medium'
                            : 'badge-high'
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
