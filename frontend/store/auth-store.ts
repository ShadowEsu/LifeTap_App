import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveSession,
  scheduleTokenRefresh,
  cancelTokenRefresh,
} from '@/lib/auth';
import { authApi } from '@/lib/api-client';
import type { LoginRequest, RegisterRequest } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  initializeFromStorage: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(credentials);
          saveSession(response);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
          scheduleTokenRefresh(response.access_token, get().refreshToken);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, isLoading: false, isAuthenticated: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.register(data);
          // Auto-login after registration
          await get().login({ email: data.email, password: data.password });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        cancelTokenRefresh();
        clearSession();
        set({ user: null, isAuthenticated: false, error: null });
      },

      refreshToken: async () => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          get().logout();
          return;
        }

        try {
          const { access_token, expires_in } = await authApi.refresh(refreshToken);
          localStorage.setItem('lifetap_access_token', access_token);
          scheduleTokenRefresh(access_token, get().refreshToken);
        } catch {
          get().logout();
        }
      },

      initializeFromStorage: () => {
        const accessToken = getAccessToken();
        const user = getStoredUser();

        if (accessToken && user) {
          set({ user, isAuthenticated: true });
          scheduleTokenRefresh(accessToken, get().refreshToken);
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'lifetap-auth',
      // Only persist non-sensitive UI state — tokens are in localStorage separately
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
