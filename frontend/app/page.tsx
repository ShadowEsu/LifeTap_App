'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import RiskAssessment from '@/components/RiskAssessment';
import NewsList from '@/components/NewsList';
import Navigation from '@/components/Navigation';

const MapPanel = dynamic(() => import('@/components/MapPanel'), { ssr: false });

const SYSTEM_STATS = [
  { label: 'Uptime',       value: '14d 06h', mono: true },
  { label: 'Alerts (30d)', value: '2',        mono: true },
  { label: 'Contacts',     value: '3',        mono: true },
  { label: 'GPS Fix',      value: '±4m',      mono: true },
];

const PROTOCOL_STEPS = [
  { step: '01', label: 'BUTTON_PRESS',    desc: 'Arduino debounce → beeper pulse (100ms)' },
  { step: '02', label: 'GPS_CAPTURE',     desc: 'u-blox Neo-8M acquires fix via UART' },
  { step: '03', label: 'POST /alerts',    desc: 'Raspberry Pi transmits payload to API' },
  { step: '04', label: 'GEMINI_ASSESS',   desc: 'AI scores risk level asynchronously' },
  { step: '05', label: 'SMS_DISPATCH',    desc: 'Twilio notifies all active contacts' },
  { step: '06', label: 'WS_BROADCAST',   desc: 'Dashboard updates via WebSocket' },
];

export default function Dashboard() {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number; lng: number; address?: string;
  } | null>(null);

  useEffect(() => {
    setSelectedLocation({ lat: 37.86914, lng: -122.26003 });
  }, []);

  return (
    <div className="flex h-screen bg-gradient-subtle">
      <Navigation />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />

        <div className="flex-1 flex gap-4 overflow-hidden p-4 min-w-0">

          {/* Left: Map + Protocol */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
            {/* Map */}
            <div className="card flex-1 overflow-hidden" style={{ minHeight: 260 }}>
              <MapPanel onLocationSelect={setSelectedLocation} />
            </div>

            {/* Alert lifecycle documentation */}
            <div className="card shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold mono text-zinc-900">ALERT LIFECYCLE</h3>
                <span className="badge badge-info">Protocol v1</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROTOCOL_STEPS.map(({ step, label, desc }) => (
                  <div key={step} className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs mono text-zinc-400">{step}</span>
                      <span className="text-xs font-bold mono text-zinc-800 truncate">{label}</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-snug">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-72 flex flex-col gap-4 overflow-y-auto shrink-0">

            {/* System stats */}
            <div className="card shrink-0">
              <h3 className="text-sm font-bold mono text-zinc-900 mb-3">SYSTEM STATUS</h3>
              <div className="grid grid-cols-2 gap-2">
                {SYSTEM_STATS.map(({ label, value, mono }) => (
                  <div key={label} className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                    <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
                    <p className={`text-sm font-bold text-zinc-900 ${mono ? 'mono' : ''}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Live device terminal */}
              <div className="terminal text-xs mt-3">
                <p><span className="dim">$</span> device.status</p>
                <p className="green mt-1">● rpi-001 connected</p>
                <p className="green">● gps_lock: true (sats: 9)</p>
                <p className="green">● heartbeat: 28s ago</p>
                <p className="hi">! last_alert: 2026-06-21 10:30</p>
              </div>
            </div>

            {/* Risk Assessment */}
            <RiskAssessment location={selectedLocation} />

            {/* Local news */}
            <div className="card">
              <h3 className="text-sm font-bold mono text-zinc-900 mb-3">LOCAL ALERTS</h3>
              <NewsList location={selectedLocation} />
            </div>

            {/* Hardware spec doc */}
            <div className="card shrink-0">
              <h3 className="text-sm font-bold mono text-zinc-900 mb-3">HARDWARE SPEC</h3>
              <div className="space-y-2 text-xs text-zinc-500 leading-relaxed">
                <div className="flex justify-between">
                  <span className="text-zinc-400">MCU</span>
                  <span className="mono text-zinc-700">Arduino Pro Micro</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">SBC</span>
                  <span className="mono text-zinc-700">Raspberry Pi 4B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">GPS</span>
                  <span className="mono text-zinc-700">u-blox Neo-8M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Serial</span>
                  <span className="mono text-zinc-700">UART 9600 baud</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">GPS acc</span>
                  <span className="mono text-zinc-700">±2.5m CEP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Debounce</span>
                  <span className="mono text-zinc-700">50ms + 2s hold</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Heartbeat</span>
                  <span className="mono text-zinc-700">every 30s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">SMS SLA</span>
                  <span className="mono text-zinc-700">&lt;5s end-to-end</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
