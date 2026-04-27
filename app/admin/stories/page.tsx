'use client';

import { useEffect, useState, useCallback } from 'react';
import { BookImage, Eye, Clock, RefreshCw, ChevronLeft, ChevronRight, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="flex flex-col h-full overflow-hidden bg-chat-bg-primary">
      {/* Header */}
      <div className="p-4 sm:p-6 lg:p-8 pb-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-chat-text-primary text-2xl font-bold tracking-tight">Stories</h1>
            <div className="flex items-center gap-4 mt-1.5">
              <div className="flex items-center gap-1.5 text-chat-text-tertiary text-xs font-medium uppercase tracking-wider">
                <BookImage size={12} className="text-chat-text-tertiary" />
                <span>{stats.total} total</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-500/80 text-xs font-medium uppercase tracking-wider">
                <Clock size={12} className="text-emerald-500" />
                <span>{stats.active} active</span>
              </div>
            </div>
          </div>
          <button 
            onClick={fetchStories}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-chat-bg-secondary border border-chat-border rounded-lg text-chat-text-secondary text-sm hover:text-chat-text-primary hover:bg-chat-bg-hover transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 custom-scrollbar pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center pt-20 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-chat-border border-t-pink-500 animate-spin" />
            <p className="text-sm text-chat-text-tertiary font-medium">Loading story board...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="w-16 h-16 rounded-full bg-chat-bg-secondary flex items-center justify-center mb-4 border border-chat-border">
              <BookImage size={32} className="text-chat-text-tertiary" />
            </div>
            <h3 className="text-chat-text-primary font-semibold">No stories yet</h3>
            <p className="text-chat-text-tertiary text-sm mt-1 max-w-[240px]">Users haven't shared any moments yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {stories.map((story) => (
              <motion.div
                layoutId={`story-${story._id}`}
                key={story._id}
                onClick={() => setSelected(story)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className={`relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                  isActive(story) 
                    ? 'border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.1)]' 
                    : 'border-chat-border group-hover:border-chat-text-tertiary/30'
                } group`}
              >
                {story.mediaType === 'image' ? (
                  <img src={story.mediaUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video src={story.mediaUrl} className="w-full h-full object-cover" muted />
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                {/* Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-chat-bg-secondary border border-white/20 overflow-hidden shrink-0">
                      {story.userId?.avatar ? <img src={story.userId.avatar} className="w-full h-full object-cover" /> : <User size={10} className="m-auto mt-1 text-chat-text-tertiary" />}
                    </div>
                    <p className="text-[11px] font-bold text-white truncate drop-shadow-md">@{story.userId?.username || 'Unknown'}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-white/70 font-medium">
                      <Eye size={10} />
                      <span>{story.viewedBy.length}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${isActive(story) ? 'text-pink-400' : 'text-white/40'}`}>
                      {isActive(story) ? 'Active' : 'Expired'}
                    </div>
                  </div>
                </div>

                {/* Active Pulse indicator */}
                {isActive(story) && (
                  <div className="absolute top-3 right-3">
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-[0_0_8px_#ec4899]" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-4 bg-chat-bg-secondary/50 border-t border-chat-border flex items-center justify-between">
        <p className="text-chat-text-tertiary text-[11px] font-bold uppercase tracking-widest">
          {stats.total} total <span className="hidden sm:inline">moments</span>
        </p>
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-widest hidden xs:block">Page {page} of {totalPages}</p>
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

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            
            <motion.div
              layoutId={`story-${selected._id}`}
              className="relative w-full max-w-[400px] bg-chat-bg-secondary border border-chat-border rounded-[32px] overflow-hidden shadow-2xl flex flex-col aspect-[9/16]"
            >
              <div className="absolute inset-0">
                {selected.mediaType === 'image' ? (
                  <img src={selected.mediaUrl} className="w-full h-full object-contain bg-black" />
                ) : (
                  <video src={selected.mediaUrl} className="w-full h-full object-contain bg-black" controls autoPlay />
                )}
              </div>

              {/* Top Controls */}
              <div className="absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-pink-500 p-0.5">
                    {selected.userId?.avatar ? <img src={selected.userId.avatar} className="w-full h-full rounded-full object-cover" /> : <div className="w-full h-full bg-chat-bg-secondary rounded-full flex items-center justify-center"><User size={16} className="text-chat-text-tertiary" /></div>}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">@{selected.userId?.username}</p>
                    <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">
                      {new Date(selected.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelected(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-4">
                {selected.caption && (
                  <p className="text-white text-[15px] leading-relaxed drop-shadow-md">{selected.caption}</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-white/80">
                      <Eye size={16} />
                      <span className="text-sm font-bold">{selected.viewedBy.length} views</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border ${isActive(selected) ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' : 'bg-white/10 text-white/40 border-white/10'}`}>
                    {isActive(selected) ? `Expires in ${Math.round((new Date(selected.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))}h` : 'Expired'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

