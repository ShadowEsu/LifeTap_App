'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface MapPanelProps {
  onLocationSelect: (location: { lat: number; lng: number; address?: string }) => void;
}

export default function MapPanel({ onLocationSelect }: MapPanelProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { setError('Maps API key missing'); setLoading(false); return; }

    const loader = new Loader({ apiKey, version: 'weekly' });

    loader.importLibrary('maps').then(({ Map }) => {
      if (!mapRef.current) return;
      const map = new Map(mapRef.current, {
        zoom: 14,
        center: { lat: 37.86914, lng: -122.26003 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });
      mapInstanceRef.current = map;

      // Alert marker
      markerRef.current = new google.maps.Marker({
        position: { lat: 37.86914, lng: -122.26003 },
        map,
        title: 'LifeTap Alert',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2.5,
        },
      });

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        markerRef.current?.setPosition(pos);
        onLocationSelect(pos);
      });

      onLocationSelect({ lat: 37.86914, lng: -122.26003 });
      setLoading(false);
    }).catch(() => { setError('Failed to load map'); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim() || !mapInstanceRef.current) return;
    setSearching(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(search)}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.results?.[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        const address = data.results[0].formatted_address;
        mapInstanceRef.current.panTo({ lat, lng });
        mapInstanceRef.current.setZoom(14);
        markerRef.current?.setPosition({ lat, lng });
        onLocationSelect({ lat, lng, address });
        setSearch('');
      }
    } finally { setSearching(false); }
  };

  return (
    <div className="w-full h-full flex flex-col gap-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search any location..."
            className="pl-9 pr-4 py-2.5 text-sm"
            style={{ borderRadius: 10 }}
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </div>
        <button type="submit" disabled={searching} className="btn btn-primary px-5 text-sm">
          {searching ? '...' : 'Search'}
        </button>
      </form>

      <div className="relative flex-1 rounded-xl overflow-hidden" style={{ minHeight: 300 }}>
        <div ref={mapRef} className="w-full h-full" style={{ minHeight: 300 }} />
        {loading && (
          <div className="absolute inset-0 bg-zinc-100 flex items-center justify-center">
            <div className="text-center">
              <div className="shimmer w-12 h-12 rounded-full mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Loading map...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 bg-zinc-100 flex items-center justify-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
