'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { isAuthenticated } from '@/lib/auth';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

interface Message {
  id: string;
  from: string;
  body: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
  status?: string;
}

export default function WhatsAppPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/v1/whatsapp/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch('/api/v1/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          to: '+19254570055',
          message: messageInput
        })
      });

      if (response.ok) {
        toast.success('Message sent!');
        setMessageInput('');
        loadMessages();
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('Error sending message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-subtle">
      <Navigation />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">WhatsApp Chat</h1>
              <p className="text-gray-600">Preston +1 925 457 0055</p>
            </div>

            {/* Chat Area */}
            <div className="card flex-1 overflow-y-auto mb-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No messages yet
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.direction === 'outgoing'
                          ? 'bg-gradient-blue text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.body}</p>
                      <p className={`text-xs mt-1 ${
                        message.direction === 'outgoing'
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="card">
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
                  className="btn btn-primary px-6"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
