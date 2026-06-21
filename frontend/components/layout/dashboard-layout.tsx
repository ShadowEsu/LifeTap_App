'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { AuthGuard } from './auth-guard';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">
            <div className="animate-page-in h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
