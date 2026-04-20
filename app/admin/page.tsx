'use client';

import { useEffect, useState } from 'react';
import { getAuthToken } from "@/lib/storage";
import { Users, MessageSquare, BookImage, Ban, ShieldCheck, Activity } from 'lucide-react';

interface Stats {
  users: { total: number; banned: number; admins: number };
  messages: { total: number; deleted: number };
  stories: { total: number; active: number };
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: number; sub?: string; color: string;
}) {
  return (
    <div style={{
      background: '#0f0f11', border: '1px solid #1a1a1e', borderRadius: '14px',
      padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '12px',
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#27272a'}
    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1a1a1e'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: '#71717a', fontSize: '13px', margin: 0 }}>{label}</p>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <p style={{ color: '#f4f4f5', fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
        {value.toLocaleString()}
      </p>
      {sub && <p style={{ color: '#52525b', fontSize: '12px', margin: 0 }}>{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  function getToken() {
    return getAuthToken() || document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1] || '';
  }

  useEffect(() => {
    async function loadStats() {
      try {
        const [usersRes, messagesRes, storiesRes] = await Promise.all([
          fetch('/api/admin/users?limit=1', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('/api/admin/messages?limit=1', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('/api/admin/stories?limit=1', { headers: { Authorization: `Bearer ${getToken()}` } }),
        ]);

        const [usersData, messagesData, storiesData] = await Promise.all([
          usersRes.json(), messagesRes.json(), storiesRes.json(),
        ]);

        setStats({
          users: usersData.stats,
          messages: messagesData.stats,
          stories: storiesData.stats,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }} className="custom-scrollbar">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: '#f4f4f5', fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0' }}>Dashboard</h1>
        <p style={{ color: '#52525b', fontSize: '14px', margin: 0 }}>Platform overview and live stats</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              height: '120px', background: '#0f0f11', borderRadius: '14px',
              border: '1px solid #1a1a1e', animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : stats && (
        <>
          <p style={{ color: '#52525b', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Users</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
            <StatCard icon={Users} label="Total Users" value={stats.users.total} color="#3b82f6" />
            <StatCard icon={Ban} label="Banned Users" value={stats.users.banned} sub="Blocked from login" color="#ef4444" />
            <StatCard icon={ShieldCheck} label="Admins" value={stats.users.admins} sub="With admin role" color="#10b981" />
          </div>

          <p style={{ color: '#52525b', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Content</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <StatCard icon={MessageSquare} label="Total Messages" value={stats.messages.total} color="#8b5cf6" />
            <StatCard icon={MessageSquare} label="Deleted Messages" value={stats.messages.deleted} sub="Removed for everyone" color="#f59e0b" />
            <StatCard icon={BookImage} label="Active Stories" value={stats.stories.active} sub={`of ${stats.stories.total} total`} color="#ec4899" />
          </div>
        </>
      )}

      {/* Activity indicator */}
      <div style={{
        marginTop: '32px', background: '#0f0f11', border: '1px solid #1a1a1e',
        borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <Activity size={16} color="#3b82f6" />
        <p style={{ color: '#52525b', fontSize: '13px', margin: 0 }}>
          Live data — refreshes on every page visit
        </p>
      </div>
    </div>
  );
}
