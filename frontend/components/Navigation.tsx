'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/',                   label: 'Dashboard',  icon: '▦' },
  { href: '/history',            label: 'History',    icon: '◷' },
  { href: '/whatsapp',           label: 'WhatsApp',   icon: '◉' },
  { href: '/emergency-contacts', label: 'Contacts',   icon: '◈' },
  { href: '/ai-agent',           label: 'AI Chat',    icon: '◆' },
];

export default function Navigation() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex flex-col w-52 bg-white border-r border-zinc-200 shrink-0">
      <div className="px-5 py-5 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-zinc-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">L</span>
          </div>
          <span className="font-bold text-zinc-900 tracking-tight">LifeTap</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot"></span>
          <span className="text-xs text-zinc-400 font-medium">Live monitoring</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon }) => (
          <Link key={href} href={href} className={`sidebar-link ${pathname === href ? 'active' : ''}`}>
            <span className="text-base w-5 text-center">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-zinc-100">
        <div className="text-xs text-zinc-400">LifeTap v0.1</div>
      </div>
    </aside>
  );
}
