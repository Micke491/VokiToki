'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAuthToken } from "@/lib/storage";
import { Search, Ban, ShieldCheck, User, RefreshCw, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface UserRow {
  _id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'admin';
  isBanned: boolean;
  createdAt: string;
  lastSeen?: string;
  isOnline: boolean;
}

type SortField = 'username' | 'createdAt' | 'isBanned';
type SortOrder = 'asc' | 'desc';

function Avatar({ user }: { user: UserRow }) {
  const initials = (user.name || user.username).slice(0, 2).toUpperCase();
  if (user.avatar) {
    return <img src={user.avatar} alt={user.username} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />;
  }
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
  const color = colors[user.username.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: '34px', height: '34px', borderRadius: '50%', background: color + '25',
      border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '12px', fontWeight: 600, color, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function SortIcon({ field, sortBy, sortOrder }: { field: SortField; sortBy: SortField; sortOrder: SortOrder }) {
  if (sortBy !== field) return <ArrowUpDown size={10} style={{ color: '#3f3f46', marginLeft: '3px' }} />;
  return sortOrder === 'asc'
    ? <ArrowUp size={10} style={{ color: '#3b82f6', marginLeft: '3px' }} />
    : <ArrowDown size={10} style={{ color: '#3b82f6', marginLeft: '3px' }} />;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  function getToken() {
    return document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1] || getAuthToken() || '';
  }

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'username' ? 'asc' : 'desc');
    }
    setPage(1);
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '20', search, sortBy, sortOrder,
        ...(roleFilter ? { role: roleFilter } : {}),
      });
      const res = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch { } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, sortBy, sortOrder]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleBan(userId: string, currentBanned: boolean) {
    setActionLoading(userId + '_ban');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ isBanned: !currentBanned }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: !currentBanned } : u));
      }
    } catch { } finally {
      setActionLoading(null);
    }
  }

  async function toggleRole(userId: string, currentRole: 'user' | 'admin') {
    setActionLoading(userId + '_role');
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      }
    } catch { } finally {
      setActionLoading(null);
    }
  }

  const sortableHeaderStyle = (field: SortField): React.CSSProperties => ({
    color: sortBy === field ? '#a1a1aa' : '#52525b',
    fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px',
    userSelect: 'none', transition: 'color 0.15s',
    background: 'none', border: 'none', padding: 0, fontFamily: 'inherit',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '28px 36px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: '#f4f4f5', fontSize: '22px', fontWeight: 700, margin: '0 0 4px 0' }}>Users</h1>
            <p style={{ color: '#52525b', fontSize: '14px', margin: 0 }}>Manage accounts, roles, and bans</p>
          </div>
          <button onClick={fetchUsers} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
            background: '#18181b', border: '1px solid #27272a', borderRadius: '8px',
            color: '#a1a1aa', fontSize: '13px', cursor: 'pointer',
          }}>
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by username or email…"
              style={{
                width: '100%', padding: '9px 12px 9px 34px', background: '#0f0f11',
                border: '1px solid #1a1a1e', borderRadius: '8px', color: '#a1a1aa',
                fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            style={{
              padding: '9px 14px', background: '#0f0f11', border: '1px solid #1a1a1e',
              borderRadius: '8px', color: '#a1a1aa', fontSize: '13px', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Table header — sortable */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 110px 100px 90px 160px',
          padding: '0 16px 10px', borderBottom: '1px solid #1a1a1e',
        }}>
          <button onClick={() => handleSort('username')} style={sortableHeaderStyle('username')}>
            User <SortIcon field="username" sortBy={sortBy} sortOrder={sortOrder} />
          </button>
          <p style={{ color: '#52525b', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Email</p>
          <button onClick={() => handleSort('createdAt')} style={sortableHeaderStyle('createdAt')}>
            Registered <SortIcon field="createdAt" sortBy={sortBy} sortOrder={sortOrder} />
          </button>
          <p style={{ color: '#52525b', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Role</p>
          <button onClick={() => handleSort('isBanned')} style={sortableHeaderStyle('isBanned')}>
            Status <SortIcon field="isBanned" sortBy={sortBy} sortOrder={sortOrder} />
          </button>
          <p style={{ color: '#52525b', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Actions</p>
        </div>
      </div>

      {/* Table Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 36px 24px' }} className="custom-scrollbar">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              border: '2px solid #27272a', borderTopColor: '#2563eb',
              animation: 'spin 0.8s linear infinite'
            }} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <User size={32} color="#27272a" />
            <p style={{ color: '#52525b', fontSize: '13px', marginTop: '12px' }}>No users found</p>
          </div>
        ) : users.map((user, idx) => (
          <div key={user._id} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 110px 100px 90px 160px',
            padding: '14px 16px', borderBottom: '1px solid #0d0d0f',
            alignItems: 'center', animation: 'slideIn 0.15s ease-out',
            animationDelay: `${idx * 0.02}s`, animationFillMode: 'both',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0d0d0f'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Avatar user={user} />
              <div>
                <p style={{ color: '#f4f4f5', fontSize: '13px', fontWeight: 500, margin: '0 0 1px 0' }}>{user.name || user.username}</p>
                <p style={{ color: '#52525b', fontSize: '11px', margin: 0 }}>@{user.username}</p>
              </div>
            </div>

            {/* Email */}
            <p style={{ color: '#71717a', fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
              {user.email}
            </p>

            {/* Registration Date */}
            <p style={{ color: '#52525b', fontSize: '12px', margin: 0 }}>
              {new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
            </p>

            {/* Role Badge */}
            <div>
              <span style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                background: user.role === 'admin' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.1)',
                color: user.role === 'admin' ? '#10b981' : '#3b82f6',
                border: `1px solid ${user.role === 'admin' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'}`,
              }}>
                {user.role}
              </span>
            </div>

            {/* Banned Badge */}
            <div>
              <span style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                background: user.isBanned ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.08)',
                color: user.isBanned ? '#ef4444' : '#52525b',
                border: `1px solid ${user.isBanned ? 'rgba(239,68,68,0.2)' : 'transparent'}`,
              }}>
                {user.isBanned ? 'Banned' : 'Active'}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => toggleBan(user._id, user.isBanned)}
                disabled={actionLoading === user._id + '_ban'}
                title={user.isBanned ? 'Unban user' : 'Ban user'}
                style={{
                  padding: '6px 10px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer',
                  border: '1px solid', display: 'flex', alignItems: 'center', gap: '4px',
                  background: user.isBanned ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                  color: user.isBanned ? '#10b981' : '#ef4444',
                  borderColor: user.isBanned ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)',
                  opacity: actionLoading === user._id + '_ban' ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <Ban size={11} />
                {user.isBanned ? 'Unban' : 'Ban'}
              </button>
              <button
                onClick={() => toggleRole(user._id, user.role)}
                disabled={actionLoading === user._id + '_role'}
                title={user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                style={{
                  padding: '6px 10px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer',
                  border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'rgba(139,92,246,0.08)', color: '#8b5cf6',
                  opacity: actionLoading === user._id + '_role' ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <ShieldCheck size={11} />
                {user.role === 'admin' ? 'Demote' : 'Admin'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div style={{
        flexShrink: 0, padding: '14px 36px', borderTop: '1px solid #18181b',
        display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#3f3f46', fontSize: '12px' }}>
          {totalCount} user{totalCount !== 1 ? 's' : ''} · 20 per page
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#52525b', fontSize: '13px' }}>Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
            padding: '6px 10px', background: '#18181b', border: '1px solid #27272a',
            borderRadius: '7px', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center',
            opacity: page === 1 ? 0.4 : 1,
          }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
            padding: '6px 10px', background: '#18181b', border: '1px solid #27272a',
            borderRadius: '7px', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center',
            opacity: page === totalPages ? 0.4 : 1,
          }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
