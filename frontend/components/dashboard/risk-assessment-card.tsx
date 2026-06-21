'use client';

import React from 'react';
import { Shield, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { RiskAssessment, RiskLevel } from '@/types';
import { getRiskBadgeClasses, getRiskColor, getRiskLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface RiskAssessmentCardProps {
  assessment?: RiskAssessment;
  isLoading?: boolean;
  locationName?: string;
  coordinates?: { lat: number; lon: number };
}

function RiskMeter({ score, level }: { score: number; level: RiskLevel }) {
  const color =
    level === 'high' ? '#ef4444' : level === 'medium' ? '#f59e0b' : '#22c55e';

  const circumference = 2 * Math.PI * 40;
  const progress = ((100 - score) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        {/* Background track */}
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold" style={{ color }}>
          {score}
        </p>
        <p className="text-xs text-slate-400 font-medium">/ 100</p>
      </div>
    </div>
  );
}

export function RiskAssessmentCard({
  assessment,
  isLoading,
  locationName,
  coordinates,
}: RiskAssessmentCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2 flex-1 ml-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!assessment) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-slate-400" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Shield className="h-6 w-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">No assessment available</p>
            <p className="text-xs text-slate-400 mt-1">
              Select a location on the map to get an AI risk assessment
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { risk_level, risk_score, rationale, suggested_actions } = assessment;

  const RiskIcon = risk_level === 'high'
    ? AlertTriangle
    : risk_level === 'medium'
    ? AlertTriangle
    : CheckCircle;

  return (
    <Card className={cn('border', getRiskBadgeClasses(risk_level))}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-slate-500" />
          AI Risk Assessment
          <span
            className={cn(
              'ml-auto rounded-full px-2 py-0.5 text-xs font-semibold border',
              getRiskBadgeClasses(risk_level)
            )}
          >
            {getRiskLabel(risk_level)}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Risk meter + score */}
        <div className="flex items-center gap-4">
          <RiskMeter score={risk_score} level={risk_level} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <RiskIcon
                className={cn('h-4 w-4 flex-shrink-0', getRiskColor(risk_level))}
              />
              <span className={cn('text-sm font-semibold', getRiskColor(risk_level))}>
                {getRiskLabel(risk_level)}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{rationale}</p>
          </div>
        </div>

        {/* Location info */}
        {(locationName || coordinates) && (
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-700 truncate">
              {locationName ?? `${coordinates?.lat.toFixed(4)}, ${coordinates?.lon.toFixed(4)}`}
            </p>
            {coordinates && locationName && (
              <p className="text-xs text-slate-400">
                {coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}
              </p>
            )}
          </div>
        )}

        {/* Suggested actions */}
        {suggested_actions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
              Recommended Actions
            </p>
            <ul className="space-y-1.5">
              {suggested_actions.slice(0, 3).map((action, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ChevronRight
                    className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', getRiskColor(risk_level))}
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
