'use client';

import React from 'react';
import { Bell, MapPin, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AlertListItem } from '@/types';
import {
  getRiskBadgeClasses,
  getRiskLabel,
  formatRelativeTime,
  formatAddress,
} from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AlertFeedProps {
  alerts: AlertListItem[];
  isLoading?: boolean;
  onAlertClick?: (alert: AlertListItem) => void;
}

function AlertItem({
  alert,
  onClick,
}: {
  alert: AlertListItem;
  onClick?: (alert: AlertListItem) => void;
}) {
  const isActive = alert.status !== 'closed';

  return (
    <button
      onClick={() => onClick?.(alert)}
      className={cn(
        'w-full text-left rounded-xl border p-3 transition-all duration-150 hover:shadow-sm',
        isActive
          ? 'border-red-100 bg-red-50/50 hover:bg-red-50'
          : 'border-slate-100 bg-white hover:bg-slate-50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div
          className={cn(
            'mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0',
            isActive ? 'bg-red-100' : 'bg-slate-100'
          )}
        >
          <Bell
            className={cn('h-3.5 w-3.5', isActive ? 'text-red-500' : 'text-slate-400')}
          />
          {isActive && (
            <span className="absolute h-2 w-2 rounded-full bg-red-500 -top-0.5 -right-0.5 border border-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {alert.risk_level && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                  getRiskBadgeClasses(alert.risk_level)
                )}
              >
                {getRiskLabel(alert.risk_level)}
              </span>
            )}
            <span
              className={cn(
                'text-[10px] font-medium',
                isActive ? 'text-red-500' : 'text-slate-400'
              )}
            >
              {isActive ? 'Active' : 'Closed'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mb-0.5">
            <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-600 truncate">
              {formatAddress(alert.location.address, alert.location.lat, alert.location.lon)}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-slate-300 flex-shrink-0" />
            <p className="text-xs text-slate-400">{formatRelativeTime(alert.timestamp)}</p>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

function AlertSkeleton() {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function AlertFeed({ alerts, isLoading, onAlertClick }: AlertFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bell className="h-4 w-4 text-slate-400" />
          Recent Alerts
          {alerts.filter((a) => a.status !== 'closed').length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {alerts.filter((a) => a.status !== 'closed').length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <AlertSkeleton key={i} />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
              <Bell className="h-5 w-5 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500">No alerts yet</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Alerts will appear here when triggered
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
            {alerts.slice(0, 8).map((alert) => (
              <AlertItem key={alert.alert_id} alert={alert} onClick={onAlertClick} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
