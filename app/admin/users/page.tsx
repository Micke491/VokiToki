'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAuthToken } from "@/lib/storage";
import { Search, Ban, ShieldCheck, User, RefreshCw, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, MoreHorizontal, ShieldAlert, XCircle, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserRow {
  _id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'admin';
  isBanned: boolean;
  timeoutUntil?: string;
  createdAt: string;
  lastSeen?: string;
  isOnline: boolean;
}

type SortField = 'username' | 'createdAt' | 'isBanned';
type SortOrder = 'asc' | 'desc';

function Avatar({ user, className = "w-8 h-8" }: { user: UserRow; className?: string }) {
  const initials = (user.name || user.username).slice(0, 2).toUpperCase();
  if (user.avatar) {
    return <img src={user.avatar} alt={user.username} className={`${className} rounded-full object-cover border border-chat-border`} />;
  }
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500'];
  const colorClass = colors[user.username.charCodeAt(0) % colors.length];
  
  return (
    <div className={`${className} rounded-full ${colorClass}/20 border border-${colorClass}/40 flex items-center justify-center text-[10px] font-bold text-chat-text-primary shrink-0`}>
      {initials}
    </div>
  );
}

function SortIcon({ field, sortBy, sortOrder }: { field: SortField; sortBy: SortField; sortOrder: SortOrder }) {
  if (sortBy !== field) return <ArrowUpDown size={12} className="text-chat-text-tertiary ml-1" />;
  return sortOrder === 'asc'
    ? <ArrowUp size={12} className="text-chat-accent ml-1" />
    : <ArrowDown size={12} className="text-chat-accent ml-1" />;
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
  const [timingOutUser, setTimingOutUser] = useState<UserRow | null>(null);
  const [customTimeout, setCustomTimeout] = useState('');
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);

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

  async function clearTimeout(userId: string) {
    setActionLoading(userId + '_timeout');
    try {
      const res = await fetch(`/api/admin/users/${userId}/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ action: 'timeout', timeoutUntil: null }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, timeoutUntil: undefined } : u));
      }
    } catch { } finally {
      setActionLoading(null);
    }
  }

  async function applyTimeout(userId: string, date: string | null) {
    setActionLoading(userId + '_timeout');
    try {
      const isoDate = date ? new Date(date).toISOString() : null;
      const res = await fetch(`/api/admin/users/${userId}/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ action: 'timeout', timeoutUntil: isoDate }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, timeoutUntil: isoDate || undefined } : u));
        setTimingOutUser(null);
        setCustomTimeout('');
      }
    } catch { } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(userId: string) {
    setActionLoading(userId + '_delete');
    try {
      const res = await fetch(`/api/admin/users/${userId}/moderation`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ action: 'delete' }),
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u._id !== userId));
        setTotalCount(prev => prev - 1);
        setDeletingUser(null);
      }
    } catch { } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-chat-bg-primary">
      {/* Header & Controls */}
      <div className="p-4 sm:p-6 lg:p-8 pb-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-chat-text-primary text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-chat-text-secondary text-sm mt-1">Manage accounts, roles, and security status</p>
          </div>
          <button 
            onClick={fetchUsers}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-chat-bg-secondary border border-chat-border rounded-lg text-chat-text-secondary text-sm hover:text-chat-text-primary hover:bg-chat-bg-hover transition-all self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-text-tertiary group-focus-within:text-chat-accent transition-colors" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by username or email…"
              className="w-full bg-chat-bg-secondary border border-chat-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-chat-text-primary placeholder:text-chat-text-tertiary focus:outline-none focus:ring-2 focus:ring-chat-accent/20 focus:border-chat-accent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
              className="bg-chat-bg-secondary border border-chat-border rounded-xl px-4 py-2.5 text-sm text-chat-text-primary focus:outline-none focus:border-chat-accent cursor-pointer min-w-[120px]"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex items-center gap-1 bg-chat-bg-secondary border border-chat-border rounded-xl px-2 text-[10px] font-bold text-chat-text-tertiary uppercase tracking-wider">
              {totalCount} Total
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 custom-scrollbar pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center pt-20 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-chat-border border-t-chat-accent animate-spin" />
            <p className="text-sm text-chat-text-tertiary font-medium">Loading platform users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="w-16 h-16 rounded-full bg-chat-bg-secondary flex items-center justify-center mb-4 border border-chat-border">
              <User size={32} className="text-chat-text-tertiary" />
            </div>
            <h3 className="text-chat-text-primary font-semibold">No users found</h3>
            <p className="text-chat-text-tertiary text-sm mt-1 max-w-[240px]">Try adjusting your search query or role filter.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block w-full">
              <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_120px] gap-4 px-4 py-3 border-b border-chat-border bg-chat-bg-secondary/30 rounded-t-xl sticky top-0 z-10 backdrop-blur-md items-center">
                <button onClick={() => handleSort('username')} className="flex items-center text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider hover:text-chat-text-primary transition-colors">
                  User <SortIcon field="username" sortBy={sortBy} sortOrder={sortOrder} />
                </button>
                <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider">Email Address</div>
                <button onClick={() => handleSort('createdAt')} className="flex items-center justify-center text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider hover:text-chat-text-primary transition-colors">
                  Joined <SortIcon field="createdAt" sortBy={sortBy} sortOrder={sortOrder} />
                </button>
                <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider text-center">Role</div>
                <button onClick={() => handleSort('isBanned')} className="flex items-center justify-center text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider hover:text-chat-text-primary transition-colors">
                  Status <SortIcon field="isBanned" sortBy={sortBy} sortOrder={sortOrder} />
                </button>
                <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider text-center">Actions</div>
              </div>

              <div className="divide-y divide-chat-border/50 bg-chat-bg-secondary/10 border-x border-b border-chat-border rounded-b-xl">
                {users.map((user) => (
                  <div key={user._id} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_120px] gap-4 px-4 py-4 items-center hover:bg-chat-bg-hover/20 transition-colors group">
                    {/* User Profile */}
                    <div className="flex items-center gap-3">
                      <Avatar user={user} className="w-9 h-9" />
                      <div className="min-w-0">
                        <p className="text-chat-text-primary text-sm font-semibold truncate">{user.name || user.username}</p>
                        <p className="text-chat-text-tertiary text-xs">@{user.username}</p>
                      </div>
                    </div>

                    {/* Email */}
                    <p className="text-chat-text-secondary text-[13px] truncate pr-4">{user.email}</p>

                    {/* Date */}
                    <p className="text-chat-text-tertiary text-[12px] text-center">
                      {new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>

                    {/* Role Badge */}
                    <div className="flex justify-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        user.role === 'admin' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-chat-accent/10 text-chat-accent border-chat-accent/20'
                      }`}>
                        {user.role}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-center gap-1">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        user.isBanned 
                          ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                          : 'bg-chat-text-tertiary/10 text-chat-text-secondary border-chat-text-tertiary/20'
                      }`}>
                        {user.isBanned ? 'Banned' : 'Active'}
                      </span>
                      {user.timeoutUntil && new Date(user.timeoutUntil) > new Date() && (
                        <span className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Timed Out
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {user.timeoutUntil && new Date(user.timeoutUntil) > new Date() && (
                        <button
                          onClick={() => clearTimeout(user._id)}
                          disabled={actionLoading === user._id + '_timeout'}
                          className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                          title="Clear Timeout"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                        <button
                          onClick={() => setTimingOutUser(user)}
                          className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                          title="Timeout User"
                        >
                          <Clock size={16} />
                        </button>
                      <button
                        onClick={() => toggleBan(user._id, user.isBanned)}
                        disabled={actionLoading === user._id + '_ban'}
                        className={`p-2 rounded-lg transition-all ${
                          user.isBanned 
                            ? 'text-emerald-500 hover:bg-emerald-500/10' 
                            : 'text-red-500 hover:bg-red-500/10'
                        }`}
                        title={user.isBanned ? 'Unban User' : 'Ban User'}
                      >
                        <Ban size={16} />
                      </button>
                      <button
                        onClick={() => toggleRole(user._id, user.role)}
                        disabled={actionLoading === user._id + '_role'}
                        className="p-2 text-purple-500 hover:bg-purple-500/10 rounded-lg transition-all"
                        title={user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      >
                        <ShieldCheck size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingUser(user)}
                        disabled={actionLoading?.includes('_delete')}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((user) => (
                <div key={user._id} className="bg-chat-bg-secondary border border-chat-border rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} className="w-11 h-11" />
                      <div>
                        <p className="text-chat-text-primary font-bold">{user.name || user.username}</p>
                        <p className="text-chat-text-tertiary text-xs">@{user.username}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                        user.role === 'admin' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-chat-accent/10 text-chat-accent border-chat-accent/20'
                      }`}>
                        {user.role}
                      </span>
                      {user.isBanned && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20">
                          Banned
                        </span>
                      )}
                      {user.timeoutUntil && new Date(user.timeoutUntil) > new Date() && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Timed Out
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-chat-border/50">
                    <div>
                      <p className="text-[10px] font-bold text-chat-text-tertiary uppercase mb-0.5">Email</p>
                      <p className="text-xs text-chat-text-secondary truncate">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-chat-text-tertiary uppercase mb-0.5">Joined</p>
                      <p className="text-xs text-chat-text-secondary">
                        {new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {user.timeoutUntil && new Date(user.timeoutUntil) > new Date() && (
                      <button
                        onClick={() => clearTimeout(user._id)}
                        disabled={actionLoading === user._id + '_timeout'}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-amber-500/5 text-amber-500 border border-amber-500/10 active:scale-95 transition-all"
                      >
                        <XCircle size={14} />
                        Clear Timeout
                      </button>
                    )}
                    <button
                      onClick={() => setTimingOutUser(user)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-amber-500/5 text-amber-500 border border-amber-500/10 active:scale-95 transition-all"
                    >
                      <Clock size={14} />
                      Timeout
                    </button>
                    <button
                      onClick={() => toggleBan(user._id, user.isBanned)}
                      disabled={actionLoading === user._id + '_ban'}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        user.isBanned 
                          ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10 active:scale-95' 
                          : 'bg-red-500/5 text-red-500 border-red-500/10 active:scale-95'
                      }`}
                    >
                      <Ban size={14} />
                      {user.isBanned ? 'Unban User' : 'Ban User'}
                    </button>
                    <button
                      onClick={() => toggleRole(user._id, user.role)}
                      disabled={actionLoading === user._id + '_role'}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-purple-500/5 text-purple-500 border border-purple-500/10 transition-all active:scale-95"
                    >
                      <ShieldCheck size={14} />
                      {user.role === 'admin' ? 'Demote' : 'Make Admin'}
                    </button>
                    <button
                      onClick={() => setDeletingUser(user)}
                      disabled={actionLoading?.includes('_delete')}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-red-500/5 text-red-500 border border-red-500/10 transition-all active:scale-95"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-4 bg-chat-bg-secondary/50 border-t border-chat-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-chat-text-tertiary text-xs font-medium">
          Showing <span className="text-chat-text-secondary">{Math.min(totalCount, (page - 1) * 20 + 1)}-{Math.min(totalCount, page * 20)}</span> of <span className="text-chat-text-secondary">{totalCount}</span> platform users
        </p>
        <div className="flex items-center gap-4">
          <p className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-widest hidden sm:block">Page {page} of {totalPages}</p>
          <div className="flex gap-1.5">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="p-2 bg-chat-bg-primary border border-chat-border rounded-lg text-chat-text-secondary disabled:opacity-30 disabled:cursor-not-not-allowed hover:text-chat-text-primary transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              className="p-2 bg-chat-bg-primary border border-chat-border rounded-lg text-chat-text-secondary disabled:opacity-30 disabled:cursor-not-not-allowed hover:text-chat-text-primary transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Timeout Mini-Modal */}
      <AnimatePresence>
        {timingOutUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTimingOutUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-chat-bg-secondary border border-chat-border rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-chat-text-primary">Timeout @{timingOutUser?.username}</h3>
                  <p className="text-[10px] text-chat-text-tertiary">User will be unable to login until expiry</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '1 Hour', val: 1 },
                    { label: '24 Hours', val: 24 },
                    { label: '3 Days', val: 72 },
                    { label: '1 Week', val: 168 }
                  ].map(q => (
                    <button
                      key={q.label}
                      onClick={() => {
                        if (!timingOutUser) return;
                        const d = new Date();
                        d.setHours(d.getHours() + q.val);
                        applyTimeout(timingOutUser._id, d.toISOString());
                      }}
                      className="py-2 bg-chat-bg-primary border border-chat-border rounded-lg text-xs font-bold text-chat-text-secondary hover:border-amber-500/50 hover:text-amber-500 transition-all"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                   <div className="text-[10px] font-bold text-chat-text-tertiary uppercase tracking-widest mb-1.5 ml-1">Custom Expiry</div>
                   <input 
                     type="datetime-local"
                     className="w-full bg-chat-bg-primary border border-chat-border rounded-lg px-3 py-2 text-xs text-chat-text-primary focus:outline-none focus:border-amber-500/50"
                     value={customTimeout}
                     onChange={(e) => setCustomTimeout(e.target.value)}
                   />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setTimingOutUser(null)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold text-chat-text-tertiary hover:bg-chat-bg-hover transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!customTimeout || actionLoading?.includes('timeout')}
                    onClick={() => timingOutUser && applyTimeout(timingOutUser._id, customTimeout)}
                    className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/10"
                  >
                    Set Timeout
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {deletingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-chat-bg-secondary border border-chat-border rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-chat-text-primary">Delete @{deletingUser?.username}?</h3>
                  <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">Permanent Destruction</p>
                </div>
              </div>

              <div className="p-4 bg-chat-bg-primary rounded-2xl border border-chat-border mb-6">
                <p className="text-xs text-chat-text-secondary leading-relaxed">
                  You are about to permanently erase <span className="text-chat-text-primary font-bold">@{deletingUser?.username}</span>. This will wipe all messages, media, and platform activity.
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-red-500">
                  <AlertTriangle size={12} />
                  THIS ACTION CANNOT BE UNDONE
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-chat-text-tertiary hover:bg-chat-bg-hover transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={actionLoading?.includes('_delete')}
                  onClick={() => deletingUser && deleteUser(deletingUser._id)}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  {actionLoading?.includes('_delete') ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Hard Delete
                    </>
                  )}
                </button>
              </div>

              {/* Decorative element to match reports page style */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-500/5 blur-[40px] rounded-full pointer-events-none" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

