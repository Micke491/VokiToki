'use client';

import { useEffect, useState } from 'react';
import { getAuthToken } from "@/lib/storage";
import { Users, MessageSquare, BookImage, Ban, ShieldCheck, Activity, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-chat-bg-secondary border border-chat-border rounded-xl p-5 flex flex-col gap-3 transition-colors hover:border-chat-text-tertiary/50"
    >
      <div className="flex items-center justify-between">
        <p className="text-chat-text-tertiary text-xs font-medium uppercase tracking-wider">{label}</p>
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-chat-text-primary text-2xl font-bold tracking-tight">
          {value.toLocaleString()}
        </p>
        {sub && <p className="text-chat-text-tertiary text-[11px] leading-tight">{sub}</p>}
      </div>
    </motion.div>
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
    <div className="bg-chat-bg-secondary border border-chat-border rounded-xl p-5 transition-colors hover:border-chat-text-tertiary/50 flex flex-col flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon size={14} style={{ color }} />
          </div>
          <p className="text-chat-text-secondary text-sm font-semibold">{title}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-chat-bg-primary rounded-md border border-chat-border/50">
          <TrendingUp size={12} style={{ color }} />
          <span className="text-sm font-bold" style={{ color }}>{total}</span>
          <span className="text-chat-text-tertiary text-[10px] uppercase font-medium">7d</span>
        </div>
      </div>

      {/* Chart Wrapper with Horizontal Scroll on Mobile */}
      <div className="overflow-x-auto scrollbar-none pb-2">
        <div className="flex justify-center min-w-max px-2">
          <svg width={totalWidth} height={chartH + 28} className="overflow-visible">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
              <line
                key={i}
                x1={0} x2={totalWidth}
                y1={chartH - chartH * pct} y2={chartH - chartH * pct}
                stroke="currentColor" className="text-chat-border" strokeWidth={1}
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
                  className="cursor-pointer"
                >
                  {/* Hover background */}
                  <rect
                    x={x - 4} y={0}
                    width={barWidth + 8} height={chartH}
                    rx={6} className="fill-transparent hover:fill-chat-text-primary/5 transition-colors"
                  />

                  {/* Bar */}
                  <rect
                    x={x} y={y}
                    width={barWidth} height={Math.max(barH, 2)}
                    rx={6} ry={6}
                    style={{
                      fill: isHovered ? color : `${color}cc`,
                      transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), y 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), fill 0.15s',
                      transitionDelay: `${i * 0.06}s`,
                    }}
                  />

                  {/* Day label */}
                  <text
                    x={x + barWidth / 2} y={chartH + 18}
                    className={`text-[10px] font-medium transition-colors ${isHovered ? 'fill-chat-text-secondary' : 'fill-chat-text-tertiary'}`}
                    textAnchor="middle"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
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
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-chat-text-primary text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-chat-text-secondary text-sm mt-1">Platform overview and live stats</p>
      </div>

      {/* Stats Section */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-chat-bg-secondary rounded-xl border border-chat-border animate-pulse" />
          ))}
        </div>
      ) : stats && (
        <div className="space-y-8">
          {/* User Stats */}
          <div className="space-y-4">
            <h2 className="text-chat-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">User Management</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard icon={Users} label="Total Users" value={stats.users.total} color="#3b82f6" />
              <StatCard icon={Ban} label="Banned Users" value={stats.users.banned} sub="Blocked from login" color="#ef4444" />
              <StatCard icon={ShieldCheck} label="Admins" value={stats.users.admins} sub="With admin role" color="#10b981" />
            </div>
          </div>

          {/* Content Stats */}
          <div className="space-y-4">
            <h2 className="text-chat-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">Platform Content</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard icon={MessageSquare} label="Total Messages" value={stats.messages.total} color="#8b5cf6" />
              <StatCard icon={MessageSquare} label="Deleted Messages" value={stats.messages.deleted} sub="Removed for everyone" color="#f59e0b" />
              <StatCard icon={BookImage} label="Active Stories" value={stats.stories.active} sub={`of ${stats.stories.total} total`} color="#ec4899" />
            </div>
          </div>

          {/* Activity Charts */}
          {activity.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-chat-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">Weekly Activity</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <BarChart data={activity} dataKey="messages" color="#3b82f6" title="Messages Sent" icon={MessageSquare} />
                <BarChart data={activity} dataKey="users" color="#10b981" title="New Registrations" icon={Users} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-chat-bg-secondary/50 border border-chat-border rounded-xl p-5 flex items-center gap-3">
        <div className="p-2 bg-chat-accent/10 rounded-lg">
          <Activity size={16} className="text-chat-accent" />
        </div>
        <p className="text-chat-text-secondary text-xs sm:text-sm">
          Live data dashboard — Stats refresh automatically on every visit.
        </p>
      </div>
    </div>
  );
}

