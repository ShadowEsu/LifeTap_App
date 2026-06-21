'use client';

import { usePathname } from 'next/navigation';

const PAGE_LABELS: Record<string, { title: string; sub: string }> = {
  '/':                   { title: 'Dashboard',            sub: 'Real-time map & danger assessment' },
  '/history':            { title: 'Alert History',        sub: 'Full audit trail of all alerts' },
  '/whatsapp':           { title: 'WhatsApp Monitor',     sub: 'Incoming alerts via Twilio sandbox' },
  '/emergency-contacts': { title: 'Emergency Contacts',   sub: 'Manage SMS notification recipients' },
  '/ai-agent':           { title: 'AI Safety Assistant',  sub: 'Powered by Gemini 2.0 Flash' },
};

export default function Header() {
  const pathname = usePathname();
  const page = PAGE_LABELS[pathname] ?? { title: 'LifeTap', sub: '' };

  return (
    <header className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-4 shrink-0">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-zinc-900 mono truncate">{page.title}</h2>
        <p className="text-xs text-zinc-400 mt-0.5 truncate">{page.sub}</p>
      </div>

      <div className="ml-auto flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="status-dot online"></span>
          <span className="text-xs text-zinc-500">System Online</span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-zinc-200" />
        <div className="text-xs mono text-zinc-400 bg-zinc-50 border border-zinc-200 px-2 py-1 rounded-md">
          rpi-001
        </div>
      </div>
    </header>
  );
}
