'use client';

import { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import { format } from 'date-fns';

interface Message {
  id: string;
  from: string;
  body: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
}

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    from: 'whatsapp:+19254570055',
    body: 'LifeTap Alert: An alert signal was triggered at 10:30 AM. View live location: https://maps.google.com/?q=37.86914,-122.26003 (Altitude: 115m)',
    timestamp: '2026-06-21T10:30:27Z',
    direction: 'incoming',
  },
  {
    id: '2',
    from: 'whatsapp:+16892644297',
    body: 'Alert received. Emergency services have been notified. Stay on the line.',
    timestamp: '2026-06-21T10:30:45Z',
    direction: 'outgoing',
  },
  {
    id: '3',
    from: 'whatsapp:+19254570055',
    body: 'LifeTap Alert: An alert signal was triggered at 10:30 AM. View live location: https://maps.google.com/?q=37.86924,-122.26000 (Altitude: 115m)',
    timestamp: '2026-06-21T10:30:56Z',
    direction: 'incoming',
  },
];

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || sending) return;
    setSending(true);
    const newMsg: Message = {
      id: Date.now().toString(),
      from: 'whatsapp:+16892644297',
      body: messageInput,
      timestamp: new Date().toISOString(),
      direction: 'outgoing',
    };
    setMessages(prev => [...prev, newMsg]);
    setMessageInput('');
    setSending(false);
  };

  return (
    <div className="flex h-screen bg-gradient-subtle">
      <Navigation />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="max-w-3xl mx-auto w-full h-full flex flex-col">

            <div className="mb-5">
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
              <p className="text-sm text-gray-500 mt-0.5">Preston +1 925 457 0055</p>
            </div>

            {/* Messages */}
            <div className="card flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-sm px-4 py-2.5 rounded-lg text-sm ${
                      msg.direction === 'outgoing'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.body}</p>
                    {msg.body.includes('maps.google.com') && (
                      <a
                        href={msg.body.match(/https:\/\/maps\.google\.com[^\s)]*/)?.[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs underline mt-1 block ${
                          msg.direction === 'outgoing' ? 'text-gray-300' : 'text-gray-500'
                        }`}
                      >
                        Open in Maps
                      </a>
                    )}
                    <p className={`text-xs mt-1 ${
                      msg.direction === 'outgoing' ? 'text-gray-400' : 'text-gray-400'
                    }`}>
                      {format(new Date(msg.timestamp), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="card py-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !messageInput.trim()}
                  className="btn btn-primary px-5"
                >
                  Send
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
