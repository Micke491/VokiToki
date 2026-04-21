'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAuthToken } from "@/lib/storage";
import { Search, Trash2, Image, Video, Mic, MessageSquare, ChevronLeft, ChevronRight, RefreshCw, X, UserX } from 'lucide-react';

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

function MediaIcon({ type }: { type?: string }) {
  if (!type || type === 'call' || type === 'sticker') return null;
  const Icon = mediaIcons[type] || MessageSquare;
  return <Icon size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: '#71717a' }} />;
}

function SenderDisplay({ msg }: { msg: MsgRow }) {
  const senderDeleted = !msg.sender;
  const displayName = msg.sender?.username || msg.senderUsername || 'Unknown';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ color: senderDeleted ? '#52525b' : '#71717a', fontSize: '12px' }}>
        {displayName}
      </span>
      {senderDeleted && msg.senderUsername && (
        <span style={{
          fontSize: '9px', color: '#3f3f46', background: '#1a1a1e',
          padding: '1px 5px', borderRadius: '3px', fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: '3px',
        }}>
          <UserX size={8} />
          deleted
        </span>
      )}
    </span>
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

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0c0c0e', border: '1px solid #1a1a1e', borderRadius: '16px',
          width: '100%', maxWidth: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          animation: 'modalSlideIn 0.2s ease-out',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid #18181b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '7px',
              background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquare size={13} color="#3b82f6" />
            </div>
            <p style={{ color: '#f4f4f5', fontSize: '14px', fontWeight: 600, margin: 0 }}>Conversation Context</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #27272a',
              background: '#18181b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#71717a', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3f3f46'; (e.currentTarget as HTMLElement).style.color = '#a1a1aa'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#27272a'; (e.currentTarget as HTMLElement).style.color = '#71717a'; }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }} className="custom-scrollbar">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                border: '2px solid #27272a', borderTopColor: '#2563eb',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          ) : error ? (
            <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>{error}</p>
          ) : messages.length === 0 ? (
            <p style={{ color: '#52525b', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>No messages found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {messages.map((msg) => {
                const isPivot = !!(msg as any)._isPivot;
                const senderName = msg.sender?.username || msg.senderUsername || 'Unknown';
                const senderDeleted = !msg.sender && !!msg.senderUsername;

                return (
                  <div key={msg._id} style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: isPivot ? 'rgba(59,130,246,0.08)' : 'transparent',
                    border: isPivot ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
                    transition: 'background 0.1s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ color: isPivot ? '#3b82f6' : '#71717a', fontSize: '11px', fontWeight: 600 }}>
                        {senderName}
                      </span>
                      {senderDeleted && (
                        <span style={{
                          fontSize: '8px', color: '#3f3f46', background: '#1a1a1e',
                          padding: '1px 4px', borderRadius: '3px',
                        }}>deleted</span>
                      )}
                      <span style={{ color: '#27272a', fontSize: '10px' }}>·</span>
                      <span style={{ color: '#3f3f46', fontSize: '10px' }}>
                        {new Date(msg.createdAt).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {isPivot && (
                        <span style={{
                          marginLeft: 'auto', fontSize: '9px', fontWeight: 600, color: '#3b82f6',
                          background: 'rgba(59,130,246,0.12)', padding: '1px 6px', borderRadius: '4px',
                        }}>SELECTED</span>
                      )}
                    </div>
                    <p style={{
                      color: msg.isDeletedForEveryone ? '#3f3f46' : (isPivot ? '#e4e4e7' : '#a1a1aa'),
                      fontSize: '13px', margin: 0, lineHeight: '1.5',
                      textDecoration: msg.isDeletedForEveryone ? 'line-through' : 'none',
                      fontStyle: msg.isDeletedForEveryone ? 'italic' : 'normal',
                    }}>
                      {msg.mediaType && <MediaIcon type={msg.mediaType} />}
                      {msg.text || `[${msg.mediaType || 'media'}]`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '28px 36px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ color: '#f4f4f5', fontSize: '22px', fontWeight: 700, margin: '0 0 4px 0' }}>Messages</h1>
            <div style={{ display: 'flex', gap: '16px' }}>
              <p style={{ color: '#52525b', fontSize: '13px', margin: 0 }}>{total.toLocaleString()} total</p>
              <p style={{ color: '#f59e0b', fontSize: '13px', margin: 0 }}>{deleted.toLocaleString()} deleted</p>
            </div>
          </div>
          <button onClick={fetchMessages} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
            background: '#18181b', border: '1px solid #27272a', borderRadius: '8px',
            color: '#a1a1aa', fontSize: '13px', cursor: 'pointer',
          }}>
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '20px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search text or @username to filter by sender…"
            style={{
              width: '100%', padding: '9px 12px 9px 34px', background: '#0f0f11',
              border: '1px solid #1a1a1e', borderRadius: '8px', color: '#a1a1aa',
              fontSize: '13px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 90px 80px',
          padding: '0 16px 10px', borderBottom: '1px solid #1a1a1e',
        }}>
          {['Content', 'From', 'Chat', 'Date', 'Flags'].map(h => (
            <p key={h} style={{ color: '#52525b', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>{h}</p>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 36px 24px' }} className="custom-scrollbar">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              border: '2px solid #27272a', borderTopColor: '#2563eb',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : messages.map((msg, idx) => (
          <div key={msg._id}
            onClick={() => setContextMsgId(msg._id)}
            style={{
              display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 90px 80px',
              padding: '12px 16px', borderBottom: '1px solid #0d0d0f', alignItems: 'center',
              background: msg.isDeletedForEveryone ? 'rgba(239,68,68,0.03)' : 'transparent',
              animation: 'slideIn 0.15s ease-out', animationDelay: `${idx * 0.015}s`,
              animationFillMode: 'both', transition: 'background 0.1s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = msg.isDeletedForEveryone ? 'rgba(239,68,68,0.06)' : '#0d0d0f'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = msg.isDeletedForEveryone ? 'rgba(239,68,68,0.03)' : 'transparent'}
          >
            {/* Content */}
            <div style={{ paddingRight: '12px', overflow: 'hidden' }}>
              <p style={{
                color: msg.isDeletedForEveryone ? '#52525b' : '#a1a1aa',
                fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textDecoration: msg.isDeletedForEveryone ? 'line-through' : 'none',
                fontStyle: msg.isDeletedForEveryone ? 'italic' : 'normal',
              }}>
                <MediaIcon type={msg.mediaType} />
                {msg.text || `[${msg.mediaType || 'media'}]`}
              </p>
            </div>

            {/* Sender — uses senderUsername snapshot */}
            <SenderDisplay msg={msg} />

            {/* Chat */}
            <p style={{ color: '#71717a', fontSize: '12px', margin: 0 }}>
              {msg.chatId?.isGroupChat ? (msg.chatId?.name || 'Group') : 'DM'}
            </p>

            {/* Date */}
            <p style={{ color: '#52525b', fontSize: '11px', margin: 0 }}>
              {new Date(msg.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </p>

            {/* Flags */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {msg.isDeletedForEveryone && (
                <span title="Deleted for everyone">
                  <Trash2 size={12} color="#ef4444" />
                </span>
              )}
              {msg.isEdited && (
                <span style={{ fontSize: '10px', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '4px', padding: '1px 5px' }}>
                  edited
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          flexShrink: 0, padding: '14px 36px', borderTop: '1px solid #18181b',
          display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end',
        }}>
          <span style={{ color: '#52525b', fontSize: '13px' }}>Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
            padding: '6px 10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '7px',
            color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: page === 1 ? 0.4 : 1,
          }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
            padding: '6px 10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '7px',
            color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: page === totalPages ? 0.4 : 1,
          }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Context Modal */}
      {contextMsgId && (
        <ContextModal messageId={contextMsgId} onClose={() => setContextMsgId(null)} />
      )}

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
