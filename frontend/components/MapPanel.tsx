'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import toast from 'react-hot-toast';

interface MapPanelProps {
  onLocationSelect: (location: { lat: number; lng: number; address?: string }) => void;
}

export default function MapPanel({ onLocationSelect }: MapPanelProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          toast.error('Google Maps API key not configured');
          setLoading(false);
          return;
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
        });

        const { Map } = await loader.importLibrary('maps');

        if (!mapRef.current) return;

        mapInstanceRef.current = new Map(mapRef.current, {
          zoom: 12,
          center: { lat: 37.86914, lng: -122.26003 },
        });

        // Show example alert location
        new google.maps.Marker({
          position: { lat: 37.86914, lng: -122.26003 },
          map: mapInstanceRef.current,
          title: 'LifeTap Alert',
        });
        onLocationSelect({ lat: 37.86914, lng: -122.26003 });

        // Get user's location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              const userLocation = { lat: latitude, lng: longitude };
              mapInstanceRef.current?.setCenter(userLocation);
              
              // Add marker
              if (mapInstanceRef.current) {
                markerRef.current = new google.maps.Marker({
                  position: userLocation,
                  map: mapInstanceRef.current,
                  title: 'Your Location',
                });
              }
              
              onLocationSelect(userLocation);
            },
            (error) => {
              console.warn('Geolocation error:', error);
            }
          );
        }

        // Map click handler
        mapInstanceRef.current.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const location = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
            };
            onLocationSelect(location);
            
            if (markerRef.current) {
              markerRef.current.setPosition(event.latLng);
            } else {
              markerRef.current = new google.maps.Marker({
                position: event.latLng,
                map: mapInstanceRef.current,
                title: 'Selected Location',
              });
            }
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Map initialization error:', error);
        toast.error('Failed to load map');
        setLoading(false);
      }
    };

    initMap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          searchInput
        )}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        const location = { lat, lng, address: data.results[0].formatted_address };
        
        mapInstanceRef.current?.setCenter({ lat, lng });
        mapInstanceRef.current?.setZoom(14);
        
        if (markerRef.current) {
          markerRef.current.setPosition({ lat, lng });
        } else {
          markerRef.current = new google.maps.Marker({
            position: { lat, lng },
            map: mapInstanceRef.current,
            title: location.address,
          });
        }
        
        onLocationSelect(location);
        setSearchInput('');
        toast.success('Location found');
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      toast.error('Search failed');
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search location..."
          className="flex-1"
        />
        <button type="submit" className="btn btn-primary px-6">
          Search
        </button>
      </form>

      <div className="flex-1 relative rounded-lg overflow-hidden bg-gray-100">
        <div ref={mapRef} className="w-full h-full" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
            Loading map...
          </div>
        )}
      </div>
    </div>
  );
}
