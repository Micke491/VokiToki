'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAuthToken } from "@/lib/storage";
import { Search, Trash2, Image, Video, Mic, MessageSquare, ChevronLeft, ChevronRight, RefreshCw, X, UserX, Clock, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MsgRow {
  _id: string;
  text?: string;
  mediaType?: string;
  isDeletedForEveryone: boolean;
  isEdited: boolean;
  createdAt: string;
  sender?: { _id: string; username: string; email: string; avatar?: string } | null;
  senderUsername?: string;
  chatId?: { isGroupChat: boolean; name?: string };
}

interface ContextMsg {
  _id: string;
  text?: string;
  mediaType?: string;
  isDeletedForEveryone: boolean;
  createdAt: string;
  sender?: { username: string; avatar?: string } | null;
  senderUsername?: string;
  _isPivot?: boolean;
}

const mediaIcons: Record<string, any> = { image: Image, video: Video, audio: Mic };

function MediaIndicator({ type, className = "w-3 h-3" }: { type?: string; className?: string }) {
  if (!type || type === 'call' || type === 'sticker') return null;
  const Icon = mediaIcons[type] || MessageSquare;
  return <Icon className={`${className} text-chat-text-tertiary inline-block mr-1.5`} />;
}

function SenderBadge({ msg }: { msg: MsgRow }) {
  const senderDeleted = !msg.sender;
  const displayName = msg.sender?.username || msg.senderUsername || 'Unknown';

  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <span className={`text-[13px] truncate ${senderDeleted ? 'text-chat-text-tertiary italic' : 'text-chat-text-secondary font-medium'}`}>
        {displayName}
      </span>
      {senderDeleted && msg.senderUsername && (
        <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[9px] font-bold text-red-500 uppercase tracking-tighter">
          <UserX size={8} />
          Deleted
        </span>
      )}
    </div>
  );
}

function ContextModal({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<ContextMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function getToken() {
    return document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1] || getAuthToken() || '';
  }

  useEffect(() => {
    async function fetchContext() {
      try {
        const res = await fetch(`/api/admin/messages/${messageId}/context`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setMessages(data.messages || []);
      } catch {
        setError('Could not load conversation context');
      } finally {
        setLoading(false);
      }
    }
    fetchContext();
  }, [messageId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-chat-bg-secondary border border-chat-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-chat-border flex items-center justify-between bg-chat-bg-secondary/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-chat-accent/10 flex items-center justify-center">
              <MessageSquare size={16} className="text-chat-accent" />
            </div>
            <div>
              <h3 className="text-chat-text-primary font-bold">Conversation Context</h3>
              <p className="text-chat-text-tertiary text-[11px] uppercase font-bold tracking-wider">Historical Log</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-chat-text-tertiary hover:text-chat-text-primary hover:bg-chat-bg-hover rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-chat-border border-t-chat-accent rounded-full animate-spin" />
              <p className="text-sm text-chat-text-tertiary font-medium">Retrieving chat log...</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center px-6">
              <p className="text-red-500 text-sm font-medium">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {messages.map((msg) => {
                const isPivot = !!(msg as any)._isPivot;
                const senderName = msg.sender?.username || msg.senderUsername || 'Unknown';
                
                return (
                  <div 
                    key={msg._id} 
                    className={`p-4 rounded-2xl transition-all border ${
                      isPivot 
                        ? 'bg-chat-accent/5 border-chat-accent/20 ring-1 ring-chat-accent/10' 
                        : 'border-transparent hover:bg-chat-bg-hover/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] font-bold ${isPivot ? 'text-chat-accent' : 'text-chat-text-secondary'}`}>
                          {senderName}
                        </span>
                        <span className="text-chat-text-tertiary text-[10px]">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {isPivot && (
                        <span className="text-[9px] font-black uppercase bg-chat-accent text-white px-1.5 py-0.5 rounded tracking-widest">
                          Target
                        </span>
                      )}
                    </div>
                    <p className={`text-[13px] leading-relaxed ${
                      msg.isDeletedForEveryone 
                        ? 'text-chat-text-tertiary italic line-through' 
                        : (isPivot ? 'text-chat-text-primary' : 'text-chat-text-secondary')
                    }`}>
                      <MediaIndicator type={msg.mediaType} />
                      {msg.text || `[${msg.mediaType || 'Media Content'}]`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleted, setDeleted] = useState(0);
  const [contextMsgId, setContextMsgId] = useState<string | null>(null);

  function getToken() {
    return document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1] || getAuthToken() || '';
  }

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30', search });
      const res = await fetch(`/api/admin/messages?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setMessages(data.messages || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.stats?.total || 0);
      setDeleted(data.stats?.deleted || 0);
    } catch { } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-chat-bg-primary">
      {/* Header */}
      <div className="p-4 sm:p-6 lg:p-8 pb-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-chat-text-primary text-2xl font-bold tracking-tight">Messages</h1>
            <div className="flex items-center gap-4 mt-1.5">
              <div className="flex items-center gap-1.5 text-chat-text-tertiary text-xs font-medium">
                <Hash size={12} />
                <span>{total.toLocaleString()} total</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-500/80 text-xs font-medium">
                <Trash2 size={12} />
                <span>{deleted.toLocaleString()} deleted</span>
              </div>
            </div>
          </div>
          <button 
            onClick={fetchMessages}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-chat-bg-secondary border border-chat-border rounded-lg text-chat-text-secondary text-sm hover:text-chat-text-primary hover:bg-chat-bg-hover transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="relative group max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-text-tertiary group-focus-within:text-chat-accent transition-colors" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search content or @username…"
            className="w-full bg-chat-bg-secondary border border-chat-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-chat-text-primary placeholder:text-chat-text-tertiary focus:outline-none focus:ring-2 focus:ring-chat-accent/20 focus:border-chat-accent transition-all"
          />
        </div>
      </div>

      {/* Main Table Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 custom-scrollbar pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center pt-20 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-chat-border border-t-chat-accent animate-spin" />
            <p className="text-sm text-chat-text-tertiary font-medium">Scanning platform communications...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="w-16 h-16 rounded-full bg-chat-bg-secondary flex items-center justify-center mb-4 border border-chat-border">
              <MessageSquare size={32} className="text-chat-text-tertiary" />
            </div>
            <h3 className="text-chat-text-primary font-semibold">No messages found</h3>
            <p className="text-chat-text-tertiary text-sm mt-1 max-w-[240px]">We couldn't find any messages matching your criteria.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block w-full">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_100px_100px] gap-4 px-4 py-3 border-b border-chat-border bg-chat-bg-secondary/30 rounded-t-xl sticky top-0 z-10 backdrop-blur-md">
                <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider">Message Content</div>
                <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider">Sender</div>
                <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider">Conversation</div>
                <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider">Sent Date</div>
                <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider text-right pr-4">Status</div>
              </div>

              <div className="divide-y divide-chat-border/50 bg-chat-bg-secondary/10 border-x border-b border-chat-border rounded-b-xl">
                {messages.map((msg) => (
                  <div 
                    key={msg._id} 
                    onClick={() => setContextMsgId(msg._id)}
                    className={`grid grid-cols-[1.5fr_1fr_1fr_100px_100px] gap-4 px-4 py-4 items-center hover:bg-chat-bg-hover/20 transition-all cursor-pointer group ${
                      msg.isDeletedForEveryone ? 'bg-red-500/[0.02]' : ''
                    }`}
                  >
                    {/* Content */}
                    <div className="min-w-0 pr-4">
                      <p className={`text-[13px] truncate transition-colors ${
                        msg.isDeletedForEveryone 
                          ? 'text-chat-text-tertiary italic line-through' 
                          : 'text-chat-text-primary group-hover:text-chat-accent'
                      }`}>
                        <MediaIndicator type={msg.mediaType} />
                        {msg.text || `[${msg.mediaType || 'Media Content'}]`}
                      </p>
                    </div>

                    {/* Sender */}
                    <SenderBadge msg={msg} />

                    {/* Chat */}
                    <div className="flex items-center gap-1.5 text-chat-text-secondary text-[12px]">
                      <span className="opacity-60">{msg.chatId?.isGroupChat ? 'Group:' : 'Direct:'}</span>
                      <span className="font-medium truncate">{msg.chatId?.isGroupChat ? (msg.chatId?.name || 'Group Chat') : 'Private DM'}</span>
                    </div>

                    {/* Date */}
                    <p className="text-chat-text-tertiary text-[12px]">
                      {new Date(msg.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </p>

                    {/* Status */}
                    <div className="flex items-center justify-end gap-2 pr-4">
                      {msg.isDeletedForEveryone && (
                        <span className="p-1 bg-red-500/10 rounded-md text-red-500" title="Deleted for everyone">
                          <Trash2 size={12} />
                        </span>
                      )}
                      {msg.isEdited && (
                        <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] font-bold text-amber-500 uppercase tracking-tighter">
                          Edited
                        </span>
                      )}
                      {!msg.isDeletedForEveryone && !msg.isEdited && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {messages.map((msg) => (
                <div 
                  key={msg._id} 
                  onClick={() => setContextMsgId(msg._id)}
                  className={`bg-chat-bg-secondary border border-chat-border rounded-2xl p-4 active:scale-[0.98] transition-all ${
                    msg.isDeletedForEveryone ? 'border-red-500/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <SenderBadge msg={msg} />
                    <span className="text-[10px] text-chat-text-tertiary font-bold flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(msg.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  
                  <div className={`p-3 rounded-xl mb-3 text-[13px] leading-relaxed ${
                    msg.isDeletedForEveryone 
                      ? 'bg-red-500/5 text-chat-text-tertiary italic line-through' 
                      : 'bg-chat-bg-primary/50 text-chat-text-secondary border border-chat-border/30'
                  }`}>
                    <MediaIndicator type={msg.mediaType} />
                    {msg.text || `[${msg.mediaType || 'Media Content'}]`}
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="text-[11px] font-bold text-chat-text-tertiary flex items-center gap-1.5">
                      <span className="opacity-50 lowercase">in</span>
                      <span className="truncate max-w-[120px]">{msg.chatId?.isGroupChat ? (msg.chatId?.name || 'Group Chat') : 'Private DM'}</span>
                    </div>
                    <div className="flex gap-2">
                      {msg.isEdited && (
                        <span className="text-[9px] font-bold text-amber-500 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10">EDITED</span>
                      )}
                      <span className="text-[9px] font-bold text-chat-accent bg-chat-accent/5 px-1.5 py-0.5 rounded border border-chat-accent/10">DETAILS</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-4 bg-chat-bg-secondary/50 border-t border-chat-border flex items-center justify-between">
        <p className="text-chat-text-tertiary text-[11px] font-bold uppercase tracking-widest">
          {total.toLocaleString()} total <span className="hidden sm:inline">records</span>
        </p>
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-widest hidden xs:block">Page {page} / {totalPages}</p>
          <div className="flex gap-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="p-1.5 bg-chat-bg-primary border border-chat-border rounded-lg text-chat-text-secondary disabled:opacity-30 hover:text-chat-text-primary transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              className="p-1.5 bg-chat-bg-primary border border-chat-border rounded-lg text-chat-text-secondary disabled:opacity-30 hover:text-chat-text-primary transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Context Modal */}
      <AnimatePresence>
        {contextMsgId && (
          <ContextModal messageId={contextMsgId} onClose={() => setContextMsgId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

