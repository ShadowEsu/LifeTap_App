'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold tracking-tight text-gray-900">
        LifeTap
      </Link>
      <nav className="flex items-center gap-5 text-sm font-medium">
        {[
          { href: '/',                   label: 'Dashboard' },
          { href: '/history',            label: 'History' },
          { href: '/whatsapp',           label: 'WhatsApp' },
          { href: '/emergency-contacts', label: 'Contacts' },
          { href: '/ai-agent',           label: 'AI' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`transition-colors ${
              pathname === href ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
