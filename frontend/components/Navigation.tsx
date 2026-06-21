'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

const links = [
  { href: '/',                   label: 'Dashboard',  icon: '▦' },
  { href: '/history',            label: 'History',    icon: '◷' },
  { href: '/whatsapp',           label: 'WhatsApp',   icon: '◉' },
  { href: '/emergency-contacts', label: 'Contacts',   icon: '◈' },
  { href: '/ai-agent',           label: 'AI Chat',    icon: '◆' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [width, setWidth] = useState(220);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const newW = Math.max(160, Math.min(320, startW.current + ev.clientX - startX.current));
      setWidth(newW);
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width]);

  return (
    <aside
      className="hidden lg:flex flex-col bg-white border-r border-zinc-200 shrink-0 relative"
      style={{ width }}
    >
      {/* Brand */}
      <div className="px-4 py-5 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">L</span>
          </div>
          {width > 170 && <span className="font-bold text-zinc-900 tracking-tight truncate">LifeTap</span>}
        </div>
        {width > 170 && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot shrink-0"></span>
            <span className="text-xs text-zinc-400 font-medium truncate">Live monitoring</span>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-hidden">
        {links.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-link ${pathname === href ? 'active' : ''}`}
            title={width <= 170 ? label : undefined}
          >
            <span className="icon">{icon}</span>
            {width > 170 && <span className="truncate">{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-zinc-100 overflow-hidden">
        {width > 170 ? (
          <div className="text-xs text-zinc-400 mono truncate">LifeTap v0.1</div>
        ) : (
          <div className="text-xs text-zinc-400 mono">v0.1</div>
        )}
      </div>

      {/* Drag handle */}
      <div
        className="resize-handle absolute right-0 top-0 bottom-0"
        onMouseDown={onMouseDown}
      />
    </aside>
  );
}
