'use client';

import { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import { format } from 'date-fns';

interface Message {
  id: string;
  body: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
  coords?: { lat: number; lon: number };
}

const INITIAL: Message[] = [
  {
    id: '1',
    body: 'LifeTap Alert: An alert signal was triggered at 10:30 AM. View live location: https://maps.google.com/?q=37.86914,-122.26003 (Altitude: 115m)',
    timestamp: '2026-06-21T10:30:27Z',
    direction: 'incoming',
    coords: { lat: 37.86914, lon: -122.26003 },
  },
  {
    id: '2',
    body: 'Alert received. Emergency services have been notified.',
    timestamp: '2026-06-21T10:30:45Z',
    direction: 'outgoing',
  },
  {
    id: '3',
    body: 'LifeTap Alert: Updated location at 10:30 AM. View live location: https://maps.google.com/?q=37.86924,-122.26000 (Altitude: 115m)',
    timestamp: '2026-06-21T10:30:56Z',
    direction: 'incoming',
    coords: { lat: 37.86924, lon: -122.26000 },
  },
];

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      body: input,
      timestamp: new Date().toISOString(),
      direction: 'outgoing',
    }]);
    setInput('');
  };

  return (
    <div className="flex h-screen bg-zinc-50">
      <Navigation />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex overflow-hidden">

          {/* Chat Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="bg-white border-b border-zinc-200 px-6 py-3.5 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold text-sm shrink-0">P</div>
              <div>
                <div className="font-semibold text-zinc-900 text-sm">Preston</div>
                <div className="text-xs text-zinc-400">+1 925 457 0055 · WhatsApp</div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot"></span>
                <span className="text-xs text-zinc-400">Connected</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3" style={{ background: '#f9fafb' }}>
              {messages.map((msg, i) => (
                <div key={msg.id} className={`flex fade-in ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                  style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className={`max-w-sm group ${msg.direction === 'outgoing' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.direction === 'outgoing'
                        ? 'bg-zinc-900 text-white rounded-br-sm'
                        : 'bg-white text-zinc-900 border border-zinc-200 rounded-bl-sm'
                    }`}>
                      <p>{msg.body}</p>
                      {msg.coords && (
                        <a
                          href={`https://www.google.com/maps?q=${msg.coords.lat},${msg.coords.lon}`}
                          target="_blank" rel="noopener noreferrer"
                          className={`mt-2 flex items-center gap-1.5 text-xs font-medium underline-offset-2 hover:underline ${
                            msg.direction === 'outgoing' ? 'text-zinc-300' : 'text-zinc-500'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {msg.coords.lat.toFixed(5)}, {msg.coords.lon.toFixed(5)}
                        </a>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 px-1">
                      {format(new Date(msg.timestamp), 'h:mm a')}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-zinc-200 px-5 py-4">
              <form onSubmit={send} className="flex gap-2.5">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Send a message to +1 415 523 8886..."
                  className="flex-1 text-sm"
                  style={{ borderRadius: 10 }}
                />
                <button type="submit" disabled={!input.trim()} className="btn btn-primary px-5">Send</button>
              </form>
            </div>
          </div>

          {/* Right: Alert summary panel */}
          <div className="w-72 bg-white border-l border-zinc-200 flex flex-col overflow-y-auto p-5 gap-4">
            <h3 className="font-semibold text-zinc-900 text-sm">Location Alerts</h3>
            {INITIAL.filter(m => m.coords).map(msg => (
              <a
                key={msg.id}
                href={`https://www.google.com/maps?q=${msg.coords!.lat},${msg.coords!.lon}`}
                target="_blank" rel="noopener noreferrer"
                className="block rounded-xl border border-zinc-200 p-3.5 hover:border-zinc-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                  <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Alert</span>
                  <span className="ml-auto text-xs text-zinc-400">{format(new Date(msg.timestamp), 'h:mm a')}</span>
                </div>
                <p className="text-xs font-mono text-zinc-700">{msg.coords!.lat.toFixed(5)}, {msg.coords!.lon.toFixed(5)}</p>
                <p className="text-xs text-zinc-500 mt-1">Tap to open in Maps</p>
              </a>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
