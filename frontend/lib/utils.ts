import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { RiskLevel } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';

// ---------------------------------------------------------------------------
// Tailwind utility
// ---------------------------------------------------------------------------

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Risk level helpers
// ---------------------------------------------------------------------------

export function getRiskColor(level: RiskLevel | undefined): string {
  switch (level) {
    case 'high':
      return 'text-red-600';
    case 'medium':
      return 'text-amber-600';
    case 'low':
      return 'text-green-600';
    default:
      return 'text-gray-400';
  }
}

export function getRiskBgColor(level: RiskLevel | undefined): string {
  switch (level) {
    case 'high':
      return 'bg-red-50 border-red-200';
    case 'medium':
      return 'bg-amber-50 border-amber-200';
    case 'low':
      return 'bg-green-50 border-green-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

export function getRiskBadgeClasses(level: RiskLevel | undefined): string {
  switch (level) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export function getRiskLabel(level: RiskLevel | undefined): string {
  switch (level) {
    case 'high':
      return 'High Risk';
    case 'medium':
      return 'Medium Risk';
    case 'low':
      return 'Low Risk';
    default:
      return 'Unknown';
  }
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

export function formatTimestamp(isoString: string): string {
  try {
    return format(new Date(isoString), 'MMM d, yyyy HH:mm');
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString: string): string {
  try {
    return formatDistanceToNow(new Date(isoString), { addSuffix: true });
  } catch {
    return isoString;
  }
}

// ---------------------------------------------------------------------------
// Location helpers
// ---------------------------------------------------------------------------

export function formatCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

export function formatAddress(address: string | undefined, lat: number, lon: number): string {
  return address ?? formatCoordinates(lat, lon);
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}
