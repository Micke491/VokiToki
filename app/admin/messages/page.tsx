'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAuthToken } from "@/lib/storage";
import { Search, Trash2, Image, Video, Mic, MessageSquare, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface MsgRow {
  _id: string;
  text?: string;
  mediaType?: string;
  isDeletedForEveryone: boolean;
  isEdited: boolean;
  createdAt: string;
  sender?: { username: string; email: string; avatar?: string };
  chatId?: { isGroupChat: boolean; name?: string };
}

const mediaIcons: Record<string, any> = { image: Image, video: Video, audio: Mic };

function MediaIcon({ type }: { type?: string }) {
  if (!type || type === 'call' || type === 'sticker') return null;
  const Icon = mediaIcons[type] || MessageSquare;
  return <Icon size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: '#71717a' }} />;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleted, setDeleted] = useState(0);

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
            placeholder="Search message text…"
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
          <div key={msg._id} style={{
            display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 90px 80px',
            padding: '12px 16px', borderBottom: '1px solid #0d0d0f', alignItems: 'center',
            background: msg.isDeletedForEveryone ? 'rgba(239,68,68,0.03)' : 'transparent',
            animation: 'slideIn 0.15s ease-out', animationDelay: `${idx * 0.015}s`,
            animationFillMode: 'both', transition: 'background 0.1s',
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

            {/* Sender */}
            <p style={{ color: '#71717a', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {msg.sender?.username || 'Unknown'}
            </p>

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
    </div>
  );
}
