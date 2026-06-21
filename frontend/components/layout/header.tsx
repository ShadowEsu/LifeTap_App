'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, User, Users, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useAlertsStore } from '@/store/alerts-store';
import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { alerts } = useAlertsStore();
  const [showMenu, setShowMenu] = React.useState(false);

  const unresolvedAlerts = alerts.filter((a) => a.status !== 'closed').length;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-md px-6',
        className
      )}
    >
      {/* Left: Page context */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-500">Live</span>
        </div>
        {unresolvedAlerts > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-red-50 border border-red-100 px-3 py-1">
            <Bell className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs font-semibold text-red-700">
              {unresolvedAlerts} active alert{unresolvedAlerts !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Emergency contacts quick-access */}
        <Button variant="outline" size="sm" asChild className="hidden sm:flex gap-2">
          <Link href="/emergency-contacts">
            <Users className="h-3.5 w-3.5" />
            Contacts
          </Link>
        </Button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-lifetap-400 to-lifetap-600 flex items-center justify-center">
              <span className="text-xs font-semibold text-white">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <span className="hidden sm:block max-w-[120px] truncate">{user?.name ?? 'User'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-slate-100 bg-white shadow-lg py-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>

                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    setShowMenu(false);
                    router.push('/profile');
                  }}
                >
                  <User className="h-4 w-4 text-slate-400" />
                  Profile Settings
                </button>

                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
