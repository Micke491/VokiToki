'use client';

import { useEffect, useState, useCallback } from 'react';
import { BookImage, Eye, Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAuthToken } from "@/lib/storage";

interface StoryRow {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  expiresAt: string;
  createdAt: string;
  viewedBy: { userId: string }[];
  userId?: { username: string; email: string; avatar?: string };
}

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [selected, setSelected] = useState<StoryRow | null>(null);

  function getToken() {
    return document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1] || getAuthToken() || '';
  }

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '24' });
      const res = await fetch(`/api/admin/stories?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setStories(data.stories || []);
      setTotalPages(data.pagination?.pages || 1);
      setStats(data.stats || { total: 0, active: 0 });
    } catch { } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  function isActive(story: StoryRow) {
    return new Date(story.expiresAt) > new Date();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '28px 36px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ color: '#f4f4f5', fontSize: '22px', fontWeight: 700, margin: '0 0 4px 0' }}>Stories</h1>
            <div style={{ display: 'flex', gap: '16px' }}>
              <p style={{ color: '#52525b', fontSize: '13px', margin: 0 }}>{stats.total} total</p>
              <p style={{ color: '#10b981', fontSize: '13px', margin: 0 }}>{stats.active} active</p>
            </div>
          </div>
          <button onClick={fetchStories} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
            background: '#18181b', border: '1px solid #27272a', borderRadius: '8px',
            color: '#a1a1aa', fontSize: '13px', cursor: 'pointer',
          }}>
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 36px 24px' }} className="custom-scrollbar">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              border: '2px solid #27272a', borderTopColor: '#ec4899',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : stories.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '80px' }}>
            <BookImage size={40} color="#27272a" />
            <p style={{ color: '#52525b', fontSize: '14px', marginTop: '12px' }}>No stories yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
            {stories.map(story => (
              <div
                key={story._id}
                onClick={() => setSelected(story)}
                style={{
                  borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                  border: `1px solid ${isActive(story) ? 'rgba(236,72,153,0.3)' : '#1a1a1e'}`,
                  position: 'relative', aspectRatio: '9/16', background: '#0d0d0f',
                  transition: 'transform 0.15s, border-color 0.15s',
                  boxShadow: isActive(story) ? '0 0 12px rgba(236,72,153,0.15)' : 'none',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
              >
                {story.mediaType === 'image' ? (
                  <img
                    src={story.mediaUrl}
                    alt={story.caption || 'Story'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <video src={story.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                )}

                {/* Overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)',
                }} />

                {/* Info */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px' }}>
                  <p style={{ color: '#fff', fontSize: '12px', fontWeight: 500, margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{story.userId?.username || 'Unknown'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Eye size={10} color="rgba(255,255,255,0.6)" />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>{story.viewedBy.length}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={10} color={isActive(story) ? '#ec4899' : 'rgba(255,255,255,0.4)'} />
                      <span style={{ fontSize: '10px', color: isActive(story) ? '#ec4899' : 'rgba(255,255,255,0.4)' }}>
                        {isActive(story) ? 'Active' : 'Expired'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active ring */}
                {isActive(story) && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    width: '8px', height: '8px', borderRadius: '50%', background: '#ec4899',
                    boxShadow: '0 0 6px #ec4899',
                  }} />
                )}
              </div>
            ))}
          </div>
        )}
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

      {/* Modal Lightbox */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0c0c0e', border: '1px solid #1a1a1e', borderRadius: '16px',
            overflow: 'hidden', maxWidth: '400px', width: '100%',
          }}>
            <div style={{ position: 'relative', aspectRatio: '9/16', background: '#000' }}>
              {selected.mediaType === 'image' ? (
                <img src={selected.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <video src={selected.mediaUrl} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )}
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ color: '#f4f4f5', fontSize: '14px', fontWeight: 500, margin: '0 0 4px 0' }}>@{selected.userId?.username}</p>
              {selected.caption && <p style={{ color: '#71717a', fontSize: '13px', margin: '0 0 8px 0' }}>{selected.caption}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#52525b', fontSize: '12px' }}>{selected.viewedBy.length} views</span>
                <span style={{ color: isActive(selected) ? '#ec4899' : '#52525b', fontSize: '12px' }}>
                  {isActive(selected) ? `Expires ${new Date(selected.expiresAt).toLocaleString()}` : 'Expired'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
