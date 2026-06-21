'use client';

import { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

const SUGGESTIONS = [
  'What should I do during an earthquake?',
  'How do I create an emergency kit?',
  'What are signs of a stroke?',
  'Best practices for wildfire evacuation',
];

export default function AIAgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    const placeholder: Message = { id: 'loading', role: 'assistant', content: '', timestamp: new Date(), loading: true };
    setMessages(prev => [...prev, userMsg, placeholder]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: 'You are a helpful emergency safety assistant for LifeTap. Give concise, practical safety advice.' }] },
            contents: [{ parts: [{ text }] }],
          }),
        }
      );
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
      setMessages(prev => prev.map(m => m.id === 'loading'
        ? { id: Date.now().toString(), role: 'assistant', content: reply, timestamp: new Date() }
        : m
      ));
    } catch {
      setMessages(prev => prev.map(m => m.id === 'loading'
        ? { id: Date.now().toString(), role: 'assistant', content: 'Error reaching AI. Please try again.', timestamp: new Date() }
        : m
      ));
    } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-zinc-50">
      <Navigation />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex flex-col overflow-hidden p-5">
          <div className="max-w-2xl mx-auto w-full h-full flex flex-col gap-4">

            <div>
              <h1 className="text-2xl font-bold text-zinc-900">AI Safety Assistant</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Powered by Gemini</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-6">
                  <div>
                    <div className="w-12 h-12 bg-zinc-900 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">AI</span>
                    </div>
                    <p className="text-zinc-500 text-sm text-center">Ask me anything about emergency safety</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => send(s)}
                        className="text-left px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-600 hover:border-zinc-400 hover:shadow-sm transition-all font-medium">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-lg ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {msg.loading ? (
                        <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                          <div className="flex gap-1.5 items-center h-5">
                            {[0, 1, 2].map(i => (
                              <div key={i} className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-zinc-900 text-white rounded-br-sm'
                            : 'bg-white text-zinc-900 border border-zinc-200 rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                      )}
                      <span className="text-xs text-zinc-400 px-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-3">
              <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask a safety question..."
                  disabled={loading}
                  className="flex-1 border-0 shadow-none text-sm focus:ring-0"
                  style={{ boxShadow: 'none' }}
                />
                <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary px-5">
                  {loading ? '...' : 'Send'}
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
