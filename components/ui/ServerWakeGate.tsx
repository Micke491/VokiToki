'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

// Landing/download and static pages must stay instant; everything else
// (chat, profile, settings, bot, auth pages) waits for the backend.
const PUBLIC_PATHS = ['/', '/download', '/help', '/terms', '/privacy', '/moderation', '/verify-email'];
const HEALTH_URL = API_BASE_URL.replace(/\/api\/?$/, '') + '/health';

export default function ServerWakeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic =
    !API_BASE_URL ||
    PUBLIC_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/')));

  const [ready, setReady] = useState(false);
  const [waking, setWaking] = useState(false);
  const [stillTrying, setStillTrying] = useState(false);

  useEffect(() => {
    if (isPublic || ready) return;
    let cancelled = false;
    const wakingTimer = setTimeout(() => setWaking(true), 2000);
    const stillTimer = setTimeout(() => setStillTrying(true), 90000);

    const poll = async () => {
      while (!cancelled) {
        try {
          const controller = new AbortController();
          const abortTimer = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(HEALTH_URL, { signal: controller.signal, cache: 'no-store' });
          clearTimeout(abortTimer);
          if (res.ok) {
            if (!cancelled) setReady(true);
            return;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    };
    poll();

    return () => {
      cancelled = true;
      clearTimeout(wakingTimer);
      clearTimeout(stillTimer);
    };
  }, [isPublic, ready]);

  if (isPublic || ready) return <>{children}</>;

  return (
    <div
      className="fixed inset-0 z-[99998] flex flex-col items-center justify-center gap-4 px-8 text-center"
      style={{ background: 'var(--bg-primary, #09090b)', color: 'var(--text-primary, #f4f4f5)' }}
    >
      <span className="text-3xl font-black tracking-tight">VokiToki</span>
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#2563eb' }} />
      {waking && (
        <>
          <p className="text-lg font-bold">Waking up the server…</p>
          <p className="max-w-sm text-sm" style={{ color: 'var(--text-secondary, #a1a1aa)' }}>
            Free hosting sleeps when idle. This can take up to a minute.
          </p>
        </>
      )}
      {stillTrying && (
        <p className="text-sm" style={{ color: 'var(--text-secondary, #a1a1aa)' }}>
          Still trying — hang tight…
        </p>
      )}
    </div>
  );
}
