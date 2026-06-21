'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/ai-agent', icon: Bot, label: 'AI Agent' },
  { href: '/emergency-contacts', icon: Users, label: 'Contacts' },
  { href: '/history', icon: History, label: 'History' },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-slate-100 bg-white transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-56',
        className
      )}
    >
      {/* Logo area */}
      <div className="flex h-16 items-center px-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-lifetap-500 to-lifetap-700 flex items-center justify-center shadow-sm">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-white" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-slate-800 text-sm tracking-tight">
              LifeTap
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-lifetap-50 text-lifetap-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-lifetap-600' : 'text-slate-400 group-hover:text-slate-600'
                )}
              />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {isActive && !isCollapsed && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-lifetap-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* System status */}
      {!isCollapsed && (
        <div className="mx-3 mb-4 rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-medium text-slate-600">System Online</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">All services operational</p>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full',
          'border border-slate-200 bg-white shadow-sm text-slate-400',
          'hover:bg-slate-50 hover:text-slate-600 transition-colors'
        )}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}
