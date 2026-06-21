'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  const links = [
    { href: '/',                    label: 'Dashboard' },
    { href: '/ai-agent',            label: 'AI Assistant' },
    { href: '/history',             label: 'History' },
    { href: '/emergency-contacts',  label: 'Contacts' },
    { href: '/whatsapp',            label: 'WhatsApp' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-200">
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="text-lg font-bold tracking-tight text-gray-900">LifeTap</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
