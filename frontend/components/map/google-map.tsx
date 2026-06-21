'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Search, Locate, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { AlertListItem, Location } from '@/types';
import { getRiskBgColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';
const DEFAULT_CENTER = {
  lat: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_LAT ?? '40.7128'),
  lng: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_LNG ?? '-74.0060'),
};
const DEFAULT_ZOOM = parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM ?? '13');

interface GoogleMapProps {
  alerts?: AlertListItem[];
  onLocationSelect?: (location: Location) => void;
  onAlertClick?: (alert: AlertListItem) => void;
  className?: string;
}

export function GoogleMap({ alerts = [], onLocationSelect, onAlertClick, className }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const searchBoxRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [searchValue, setSearchValue] = useState('');

  // Initialize Google Maps
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) {
      setError('Google Maps API key not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_KEY in .env.local');
      setIsLoading(false);
      return;
    }

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_KEY,
      version: 'weekly',
      libraries: ['places'],
    });

    loader
      .load()
      .then((google) => {
        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          mapTypeId: mapType,
          disableDefaultUI: true,
          styles: mapStyles,
          clickableIcons: false,
        });

        mapInstanceRef.current = map;

        // Setup search box
        if (searchInputRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
            types: ['geocode', 'establishment'],
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
              const location = place.geometry.location;
              map.setCenter(location);
              map.setZoom(15);

              onLocationSelect?.({
                lat: location.lat(),
                lon: location.lng(),
                address: place.formatted_address,
              });
            }
          });

          searchBoxRef.current = autocomplete;
        }

        // Click handler to get location info
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            onLocationSelect?.({
              lat: e.latLng.lat(),
              lon: e.latLng.lng(),
            });
          }
        });

        setIsLoading(false);
      })
      .catch(() => {
        setError('Failed to load Google Maps. Check your API key and internet connection.');
        setIsLoading(false);
      });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Update map type
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  // Render alert markers
  useEffect(() => {
    if (!mapInstanceRef.current || isLoading) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    alerts.forEach((alert) => {
      if (!alert.location?.lat || !alert.location?.lon) return;

      const riskColor = alert.risk_level === 'high'
        ? '#ef4444'
        : alert.risk_level === 'medium'
        ? '#f59e0b'
        : '#22c55e';

      const marker = new google.maps.Marker({
        position: { lat: alert.location.lat, lng: alert.location.lon },
        map: mapInstanceRef.current,
        title: `Alert ${alert.alert_id}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: riskColor,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: system-ui, sans-serif; padding: 4px 0;">
            <p style="font-size: 12px; font-weight: 600; margin: 0 0 4px 0; color: #1e293b;">
              ${alert.risk_level?.toUpperCase() ?? 'UNKNOWN'} Risk Alert
            </p>
            <p style="font-size: 11px; color: #64748b; margin: 0 0 2px 0;">
              ${alert.location.address ?? `${alert.location.lat.toFixed(4)}, ${alert.location.lon.toFixed(4)}`}
            </p>
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">
              ${new Date(alert.timestamp).toLocaleString()}
            </p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
        onAlertClick?.(alert);
      });

      markersRef.current.push(marker);
    });
  }, [alerts, isLoading, onAlertClick]);

  const centerOnUser = useCallback(() => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;

    navigator.geolocation.getCurrentPosition((position) => {
      const pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      mapInstanceRef.current?.setCenter(pos);
      mapInstanceRef.current?.setZoom(16);

      onLocationSelect?.({
        lat: pos.lat,
        lon: pos.lng,
      });
    });
  }, [onLocationSelect]);

  const zoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() ?? DEFAULT_ZOOM) + 1);
    }
  };

  const zoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() ?? DEFAULT_ZOOM) - 1);
    }
  };

  return (
    <div className={cn('relative h-full w-full overflow-hidden rounded-xl', className)}>
      {/* Search bar overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search location..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={cn(
              'h-10 w-full rounded-lg border border-slate-200 bg-white/95 backdrop-blur pl-10 pr-4 text-sm',
              'shadow-sm focus:outline-none focus:ring-2 focus:ring-lifetap-500 focus:border-lifetap-500',
              'placeholder:text-slate-400'
            )}
          />
        </div>
      </div>

      {/* Map controls */}
      <div className="absolute right-4 top-16 z-10 flex flex-col gap-2">
        <button
          onClick={zoomIn}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 backdrop-blur border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4 text-slate-600" />
        </button>
        <button
          onClick={zoomOut}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 backdrop-blur border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4 text-slate-600" />
        </button>
        <button
          onClick={centerOnUser}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 backdrop-blur border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
          aria-label="Center on my location"
        >
          <Locate className="h-4 w-4 text-slate-600" />
        </button>
        <button
          onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 backdrop-blur border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
          aria-label="Toggle map type"
        >
          <Layers className="h-4 w-4 text-slate-600" />
        </button>
      </div>

      {/* Alert count badge */}
      {alerts.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full bg-white/95 backdrop-blur border border-slate-200 shadow-sm px-3 py-1.5">
          <MapPin className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs font-medium text-slate-700">{alerts.length} alerts on map</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-lifetap-200 border-t-lifetap-600 mx-auto" />
            <p className="text-sm text-slate-500">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-50">
          <div className="text-center max-w-sm px-6">
            <div className="mb-3 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <MapPin className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">Map unavailable</p>
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}

// Minimal clean map style
const mapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f8faff' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#374151' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e8f5e9' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#e2e8f0' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#dbeafe' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#bfdbfe' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#93c5fd' }],
  },
];
