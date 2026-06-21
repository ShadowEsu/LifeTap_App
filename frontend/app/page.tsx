'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import MapPanel from '@/components/MapPanel';
import RiskAssessment from '@/components/RiskAssessment';
import NewsList from '@/components/NewsList';
import Navigation from '@/components/Navigation';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);

  useEffect(() => {
    setIsLoading(false);
    setSelectedLocation({ lat: 37.86914, lng: -122.26003 });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 text-4xl gradient-text">LifeTap</div>
          <div className="animate-pulse text-gray-500">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-subtle">
      <Navigation />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <div className="flex-1 flex gap-4 overflow-hidden p-4">
          {/* Left Panel - Map */}
          <div className="flex-1 flex flex-col">
            <div className="card flex-1 overflow-hidden">
              <MapPanel 
                onLocationSelect={setSelectedLocation}
              />
            </div>
          </div>

          {/* Right Panel - Risk Assessment & News */}
          <div className="w-80 flex flex-col gap-4 overflow-y-auto">
            {/* Risk Assessment Card */}
            <RiskAssessment location={selectedLocation} />

            {/* News Feed */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Local News & Alerts
              </h3>
              <NewsList location={selectedLocation} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
