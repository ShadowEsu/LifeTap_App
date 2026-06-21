'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Shield } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, initializeFromStorage } = useAuthStore();
  const [isChecking, setIsChecking] = React.useState(true);

  useEffect(() => {
    initializeFromStorage();
    setIsChecking(false);
  }, [initializeFromStorage]);

  useEffect(() => {
    if (!isChecking && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isChecking, isAuthenticated, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 rounded-xl bg-gradient-to-br from-lifetap-500 to-lifetap-700 flex items-center justify-center mx-auto shadow-md">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-lifetap-200 border-t-lifetap-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
