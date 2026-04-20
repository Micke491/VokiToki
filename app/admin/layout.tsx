'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, MessageSquare, BookImage, LogOut, Shield, ChevronRight } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/stories', label: 'Stories', icon: BookImage },
];

import { getAuthToken, removeAuthToken } from '@/lib/storage';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const token = getAuthToken();

        if (!token) { router.replace('/'); return; }

        const res = await fetch('/api/admin/users?limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) { router.replace('/'); return; }
        setChecking(false);
      } catch {
        router.replace('/');
      }
    }
    checkAdmin();
  }, [router]);

  function handleLogout() {
    removeAuthToken();
    router.push('/');
  }

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '2px solid #27272a', borderTopColor: '#2563eb',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#71717a', fontSize: '14px' }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#09090b', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px', flexShrink: 0, background: '#0c0c0e',
        borderRight: '1px solid #18181b', display: 'flex', flexDirection: 'column',
        padding: '0',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #18181b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(37,99,235,0.4)'
            }}>
              <Shield size={16} color="white" />
            </div>
            <div>
              <p style={{ color: '#f4f4f5', fontWeight: 600, fontSize: '14px', margin: 0 }}>Admin Panel</p>
              <p style={{ color: '#52525b', fontSize: '11px', margin: 0 }}>ChatApp Control</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '8px', textDecoration: 'none',
                color: active ? '#f4f4f5' : '#71717a',
                background: active ? '#18181b' : 'transparent',
                transition: 'all 0.15s ease',
                fontSize: '13px', fontWeight: active ? 500 : 400,
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#a1a1aa'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#71717a'; }}
              >
                <Icon size={15} style={{ flexShrink: 0, color: active ? '#3b82f6' : 'inherit' }} />
                <span style={{ flex: 1 }}>{label}</span>
                {active && <ChevronRight size={12} style={{ color: '#3b82f6' }} />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid #18181b' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '9px 12px', borderRadius: '8px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#71717a', fontSize: '13px', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717a'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <LogOut size={15} />
            Back to App
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
