'use client';

import { useEffect, useState, useRef } from 'react';
import { getAuthToken } from "@/lib/storage";
import { Users, MessageSquare, BookImage, Ban, ShieldCheck, Activity, TrendingUp } from 'lucide-react';

interface Stats {
  users: { total: number; banned: number; admins: number };
  messages: { total: number; deleted: number };
  stories: { total: number; active: number };
}

interface DayData {
  date: string;
  label: string;
  messages: number;
  users: number;
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

function BarChart({ data, dataKey, color, title, icon: Icon }: {
  data: DayData[]; dataKey: 'messages' | 'users'; color: string; title: string; icon: any;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const values = data.map(d => d[dataKey]);
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);

  const chartH = 140;
  const barWidth = 32;
  const gap = 12;
  const totalWidth = data.length * barWidth + (data.length - 1) * gap;

  return (
    <div style={{
      background: '#0f0f11', border: '1px solid #1a1a1e', borderRadius: '14px',
      padding: '22px 24px 18px', transition: 'border-color 0.2s', flex: 1, minWidth: 0,
    }}
    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#27272a'}
    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1a1a1e'}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '7px',
            background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={13} color={color} />
          </div>
          <p style={{ color: '#a1a1aa', fontSize: '13px', fontWeight: 500, margin: 0 }}>{title}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <TrendingUp size={11} color={color} />
          <span style={{ color: color, fontSize: '12px', fontWeight: 600 }}>{total}</span>
          <span style={{ color: '#52525b', fontSize: '11px' }}>last 7d</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <svg width={totalWidth} height={chartH + 28} style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <line
              key={i}
              x1={0} x2={totalWidth}
              y1={chartH - chartH * pct} y2={chartH - chartH * pct}
              stroke="#1a1a1e" strokeWidth={1}
            />
          ))}

          {data.map((d, i) => {
            const val = d[dataKey];
            const barH = animated ? (val / max) * (chartH - 8) : 0;
            const x = i * (barWidth + gap);
            const y = chartH - barH;
            const isHovered = hoveredIdx === i;

            return (
              <g key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Hover background */}
                <rect
                  x={x - 4} y={0}
                  width={barWidth + 8} height={chartH}
                  rx={6} fill={isHovered ? '#ffffff06' : 'transparent'}
                />

                {/* Bar */}
                <rect
                  x={x} y={y}
                  width={barWidth} height={Math.max(barH, 2)}
                  rx={6} ry={6}
                  fill={isHovered ? color : color + 'cc'}
                  style={{
                    transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), y 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), fill 0.15s',
                    transitionDelay: `${i * 0.06}s`,
                  }}
                />

                {/* Glow on hover */}
                {isHovered && (
                  <rect
                    x={x} y={y}
                    width={barWidth} height={Math.max(barH, 2)}
                    rx={6} ry={6}
                    fill={color} opacity={0.15}
                    style={{ filter: 'blur(6px)' }}
                  />
                )}

                {/* Value tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={x + barWidth / 2 - 16} y={y - 28}
                      width={32} height={22}
                      rx={5} fill="#18181b" stroke="#27272a" strokeWidth={1}
                    />
                    <text
                      x={x + barWidth / 2} y={y - 14}
                      fill="#f4f4f5" fontSize="11" fontWeight="600"
                      textAnchor="middle" fontFamily="inherit"
                    >
                      {val}
                    </text>
                  </g>
                )}

                {/* Day label */}
                <text
                  x={x + barWidth / 2} y={chartH + 16}
                  fill={isHovered ? '#a1a1aa' : '#52525b'}
                  fontSize="10" textAnchor="middle" fontFamily="inherit"
                  style={{ transition: 'fill 0.15s' }}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  function getToken() {
    return getAuthToken() || document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1] || '';
  }

  useEffect(() => {
    async function loadStats() {
      try {
        const [usersRes, messagesRes, storiesRes, activityRes] = await Promise.all([
          fetch('/api/admin/users?limit=1', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('/api/admin/messages?limit=1', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('/api/admin/stories?limit=1', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('/api/admin/stats/activity', { headers: { Authorization: `Bearer ${getToken()}` } }),
        ]);

        const [usersData, messagesData, storiesData, activityData] = await Promise.all([
          usersRes.json(), messagesRes.json(), storiesRes.json(), activityRes.json(),
        ]);

        setStats({
          users: usersData.stats,
          messages: messagesData.stats,
          stories: storiesData.stats,
        });
        setActivity(activityData.days || []);
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '32px' }}>
            <StatCard icon={MessageSquare} label="Total Messages" value={stats.messages.total} color="#8b5cf6" />
            <StatCard icon={MessageSquare} label="Deleted Messages" value={stats.messages.deleted} sub="Removed for everyone" color="#f59e0b" />
            <StatCard icon={BookImage} label="Active Stories" value={stats.stories.active} sub={`of ${stats.stories.total} total`} color="#ec4899" />
          </div>

          {/* Activity Charts */}
          {activity.length > 0 && (
            <>
              <p style={{ color: '#52525b', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Activity — Last 7 Days</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <BarChart data={activity} dataKey="messages" color="#3b82f6" title="Messages Sent" icon={MessageSquare} />
                <BarChart data={activity} dataKey="users" color="#10b981" title="New Registrations" icon={Users} />
              </div>
            </>
          )}
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
