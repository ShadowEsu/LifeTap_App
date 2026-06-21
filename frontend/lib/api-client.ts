import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (email: string, password: string) =>
    apiClient.post('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  refresh: () => apiClient.post('/auth/refresh', {}),
  logout: () => apiClient.post('/auth/logout', {}),
};

export const alertsAPI = {
  create: (lat: number, lon: number) =>
    apiClient.post('/alerts', { lat, lon }),
  getAll: (page = 1, limit = 20) =>
    apiClient.get('/alerts', { params: { page, limit } }),
  getById: (alertId: string) =>
    apiClient.get(`/alerts/${alertId}`),
  update: (alertId: string, data: any) =>
    apiClient.patch(`/alerts/${alertId}`, data),
};

export const contactsAPI = {
  getAll: () => apiClient.get('/contacts'),
  create: (name: string, phone: string, risk_threshold: string) =>
    apiClient.post('/contacts', { name, phone, risk_threshold }),
  update: (contactId: string, data: any) =>
    apiClient.patch(`/contacts/${contactId}`, data),
  delete: (contactId: string) =>
    apiClient.delete(`/contacts/${contactId}`),
  verify: (contactId: string, code: string) =>
    apiClient.post(`/contacts/${contactId}/verify`, { code }),
};

export const historyAPI = {
  get: (startDate?: string, endDate?: string) =>
    apiClient.get('/history/export', { params: { startDate, endDate } }),
  getStats: () =>
    apiClient.get('/history/statistics'),
};

export const hardwareAPI = {
  register: (phone: string) =>
    apiClient.post('/hardware/register', { phone }),
  heartbeat: (deviceId: string) =>
    apiClient.post('/hardware/heartbeat', { device_id: deviceId }),
};
