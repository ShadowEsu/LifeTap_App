'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="hidden lg:block w-64 bg-white border-r border-gray-200">
      <div className="p-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Navigation
        </h2>
      </div>

      <nav className="space-y-1 px-3 py-4">
        <Link
          href="/"
          className={`block px-4 py-2 rounded-lg font-medium transition ${
            isActive('/')
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          📍 Dashboard
        </Link>
        <Link
          href="/ai-agent"
          className={`block px-4 py-2 rounded-lg font-medium transition ${
            isActive('/ai-agent')
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          🤖 AI Assistant
        </Link>
        <Link
          href="/history"
          className={`block px-4 py-2 rounded-lg font-medium transition ${
            isActive('/history')
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          📋 History
        </Link>
        <Link
          href="/emergency-contacts"
          className={`block px-4 py-2 rounded-lg font-medium transition ${
            isActive('/emergency-contacts')
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          👥 Contacts
        </Link>
      </nav>
    </aside>
  );
}
