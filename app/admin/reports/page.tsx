'use client';

import { useEffect, useState, useRef } from 'react';
import { getAuthToken } from "@/lib/storage";
import { 
  ShieldAlert, 
  Filter, 
  Search, 
  ChevronRight, 
  MoreHorizontal, 
  Trash2, 
  Ban, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Eye,
  MessageSquare,
  BookImage,
  User as UserIcon,
  Calendar,
  AlertTriangle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { pusherClient } from '@/lib/pusher-client';

interface Report {
  _id: string;
  reporterId: { _id: string; username: string; avatar?: string };
  targetId: string;
  targetType: 'user' | 'message' | 'story';
  category: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
  targetInfo?: any;
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    dismissed: "bg-chat-text-tertiary/10 text-chat-text-tertiary border-chat-text-tertiary/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status as keyof typeof styles]}`}>
      {status}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md bg-chat-bg-primary text-chat-text-secondary text-[10px] font-medium border border-chat-border">
      {category}
    </span>
  );
}

function getToken() {
  if (typeof document === 'undefined') return getAuthToken() || '';
  return document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1] || getAuthToken() || '';
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modAction, setModAction] = useState<'ban' | 'timeout' | 'delete' | 'dismiss' | 'resolve' | null>(null);
  const [timeoutDate, setTimeoutDate] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/admin/reports', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.reports) setReports(data.reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    const channel = pusherClient.subscribe('admin-reports');
    channel.bind('new-report', () => {
      fetchReports();
    });

    return () => {
      pusherClient.unsubscribe('admin-reports');
    };
  }, []);

  const handleModeration = async () => {
    if (!selectedReport || !modAction) return;
    
    setActionLoading(true);
    try {
      let targetUserId = '';
      if (selectedReport.targetType === 'user') {
        targetUserId = selectedReport.targetId?.toString() || String(selectedReport.targetId);
      } else if (selectedReport.targetInfo) {
        const info = selectedReport.targetInfo;
        const sender = info.sender?._id || info.sender;
        const userField = info.userId?._id || info.userId;
        
        const rawId = sender || userField || '';
        targetUserId = rawId ? (typeof rawId === 'object' ? (rawId as any)._id?.toString() || rawId.toString() : String(rawId)) : '';
      }

      if (['ban', 'timeout', 'delete'].includes(modAction)) {
        if (!targetUserId) {
          alert("Could not determine target user for moderation.");
          setActionLoading(false);
          return;
        }

        console.log(`[REPORTS_DEBUG] Calling moderation API: /api/admin/users/${targetUserId}/moderation`);
        const modRes = await fetch(`/api/admin/users/${targetUserId}/moderation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify({
            action: modAction,
            timeoutUntil: modAction === 'timeout' && timeoutDate ? new Date(timeoutDate).toISOString() : undefined
          })
        });

        if (!modRes.ok) throw new Error("Moderation action failed");
      }

      const statusUpdate = modAction === 'dismiss' ? 'dismissed' : 'resolved';
      const reportRes = await fetch(`/api/admin/reports/${selectedReport._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          status: statusUpdate,
          adminNotes
        })
      });

      if (reportRes.ok) {
        setShowModerationModal(false);
        setSelectedReport(null);
        setModAction(null);
        setAdminNotes('');
        setTimeoutDate('');
        fetchReports();
      }
    } catch (error) {
      console.error("Moderation error:", error);
      alert("Something went wrong during moderation.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch = (r.reporterId?.username?.toLowerCase().includes(search.toLowerCase()) || false) ||
                         r.category.toLowerCase().includes(search.toLowerCase()) ||
                         r.details.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-chat-text-primary flex items-center gap-3">
              <ShieldAlert className="text-amber-500" />
              Reporting & Moderation
            </h1>
            <p className="text-chat-text-secondary text-sm mt-1">Review user reports and take disciplinary actions</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-chat-text-tertiary" />
               <input 
                 type="text"
                 placeholder="Search reports..."
                 className="pl-9 pr-4 py-2 bg-chat-bg-secondary border border-chat-border rounded-xl text-sm text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all w-full md:w-64"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
             </div>
             <div className="flex bg-chat-bg-secondary p-1 border border-chat-border rounded-xl">
               {(['all', 'pending', 'resolved', 'dismissed'] as const).map(f => (
                 <button
                   key={f}
                   onClick={() => setFilter(f)}
                   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${filter === f ? 'bg-chat-accent text-white shadow-sm' : 'text-chat-text-tertiary hover:text-chat-text-secondary'}`}
                 >
                   {f}
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 custom-scrollbar">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-chat-bg-secondary rounded-2xl border border-chat-border animate-pulse" />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="w-16 h-16 bg-chat-bg-secondary rounded-full flex items-center justify-center mb-4">
               <CheckCircle2 className="w-8 h-8 text-chat-text-tertiary" />
             </div>
             <h3 className="text-lg font-bold text-chat-text-primary">No reports found</h3>
             <p className="text-chat-text-secondary text-sm mt-1">Everything is clean! All caught up with moderation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <motion.div
                layoutId={report._id}
                key={report._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-chat-bg-secondary border border-chat-border rounded-2xl p-5 hover:border-chat-accent/30 transition-all flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Header Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-chat-bg-primary border border-chat-border shadow-sm">
                      {report.reporterId?.avatar ? (
                        <img src={report.reporterId.avatar} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-chat-text-tertiary">
                          {(report.reporterId?.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-chat-text-primary leading-tight">{report.reporterId?.username || 'Deleted User'}</span>
                      <span className="text-[10px] text-chat-text-tertiary">{format(new Date(report.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  <StatusBadge status={report.status} />
                </div>

                {/* Target Section */}
                <div className="p-3 bg-chat-bg-primary rounded-xl border border-chat-border/50 space-y-2">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider">
                       {report.targetType === 'user' ? <UserIcon size={12} /> : report.targetType === 'message' ? <MessageSquare size={12} /> : <BookImage size={12} />}
                       Reported {report.targetType}
                     </div>
                     <CategoryBadge category={report.category} />
                   </div>
                   
                   <div className="flex items-center gap-3 mt-2">
                      <div className="w-8 h-8 rounded-lg bg-chat-bg-secondary flex items-center justify-center text-chat-accent font-bold text-xs border border-chat-border">
                        {report.targetType === 'user' ? report.targetInfo?.username?.charAt(0) : report.targetType === 'message' ? 'M' : 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-chat-text-primary truncate">
                          {report.targetType === 'user' ? report.targetInfo?.username : `By ${report.targetInfo?.sender?.username || report.targetInfo?.userId?.username || 'Unknown'}`}
                        </p>
                        <p className="text-[10px] text-chat-text-tertiary truncate">Target ID: {report.targetId}</p>
                      </div>
                   </div>

                   {report.targetType === 'message' && report.targetInfo?.text && (
                     <div className="mt-2 p-2 bg-chat-bg-secondary rounded-lg text-xs text-chat-text-secondary italic line-clamp-2 border border-chat-border/30">
                       "{report.targetInfo.text}"
                     </div>
                   )}
                   
                   {report.targetType === 'story' && report.targetInfo?.mediaUrl && (
                     <div className="mt-2 relative h-20 rounded-lg overflow-hidden border border-chat-border/30">
                        <img src={report.targetInfo.mediaUrl} className="w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Eye className="text-white opacity-80" size={16} />
                        </div>
                     </div>
                   )}
                </div>

                {/* Details Section */}
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider mb-1">Reporter Details</p>
                  <p className="text-xs text-chat-text-secondary leading-relaxed line-clamp-3">
                    {report.details || "No additional details provided."}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-chat-border flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <button
                       onClick={() => {
                         setSelectedReport(report);
                         setShowModerationModal(true);
                       }}
                       className="px-3 py-1.5 bg-chat-accent hover:bg-chat-accent/90 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all"
                     >
                       Review & Moderate
                     </button>
                   </div>
                   {report.status !== 'pending' && (
                     <p className="text-[10px] text-chat-text-tertiary font-medium italic">
                       Actioned by Admin
                     </p>
                   )}
                </div>

                {/* Hover Glow */}
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-chat-accent/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-chat-accent/10 transition-colors" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Moderation Modal */}
      <AnimatePresence>
        {showModerationModal && selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModerationModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-chat-bg-secondary border border-chat-border rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              {/* Sidebar Info */}
              <div className="w-full md:w-72 bg-chat-bg-primary p-6 border-b md:border-b-0 md:border-r border-chat-border flex flex-col">
                 <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-widest mb-6">
                   <ShieldAlert size={14} /> Moderation Desk
                 </div>

                 <div className="space-y-6 flex-1">
                    <div>
                      <p className="text-[10px] font-bold text-chat-text-tertiary uppercase tracking-widest mb-2">Target Overview</p>
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-xl bg-chat-bg-secondary border border-chat-border flex items-center justify-center text-chat-accent text-xl font-bold">
                            {selectedReport.targetType === 'user' ? 'U' : selectedReport.targetType === 'message' ? 'M' : 'S'}
                         </div>
                         <div className="flex flex-col">
                            <span className="text-sm font-bold text-chat-text-primary">{selectedReport.targetType === 'user' ? selectedReport.targetInfo?.username : 'Platform Content'}</span>
                            <span className="text-[10px] text-chat-text-tertiary">{selectedReport.targetId}</span>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-chat-text-tertiary uppercase tracking-widest mb-2">Report Summary</p>
                       <p className="text-xs text-chat-text-primary"><span className="text-chat-text-tertiary">Category:</span> {selectedReport.category}</p>
                       <p className="text-xs text-chat-text-primary"><span className="text-chat-text-tertiary">Reporter:</span> {selectedReport.reporterId?.username || 'Deleted User'}</p>
                       <p className="text-xs text-chat-text-primary"><span className="text-chat-text-tertiary">Date:</span> {format(new Date(selectedReport.createdAt), 'MMM d, yyyy')}</p>
                    </div>

                    {selectedReport.targetType === 'message' && (
                      <div className="p-3 bg-chat-bg-secondary rounded-xl border border-chat-border text-xs text-chat-text-secondary leading-relaxed">
                         <p className="font-bold mb-1">Message Text:</p>
                         "{selectedReport.targetInfo?.text}"
                      </div>
                    )}
                 </div>

                 <button 
                   onClick={() => setShowModerationModal(false)}
                   className="mt-6 w-full py-2.5 rounded-xl border border-chat-border text-xs font-bold text-chat-text-secondary hover:bg-chat-bg-secondary transition-all"
                 >
                   Cancel
                 </button>
              </div>

              {/* Main Actions */}
              <div className="flex-1 p-6 space-y-6">
                 <div>
                   <h2 className="text-lg font-bold text-chat-text-primary">Disciplinary Actions</h2>
                   <p className="text-xs text-chat-text-tertiary">Select an action to take against the target user</p>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'ban', label: 'Perm Ban', icon: Ban, color: 'text-red-500', bg: 'hover:bg-red-500/10 hover:border-red-500/50' },
                      { id: 'timeout', label: 'Timeout', icon: Clock, color: 'text-amber-500', bg: 'hover:bg-amber-500/10 hover:border-amber-500/50' },
                      { id: 'delete', label: 'Hard Delete', icon: Trash2, color: 'text-red-600', bg: 'hover:bg-red-600/10 hover:border-red-600/50' },
                      { id: 'dismiss', label: 'Dismiss', icon: XCircle, color: 'text-chat-text-tertiary', bg: 'hover:bg-white/5 hover:border-chat-text-tertiary/50' },
                      { id: 'resolve', label: 'Mark Resolved', icon: CheckCircle2, color: 'text-emerald-500', bg: 'hover:bg-emerald-500/10 hover:border-emerald-500/50' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setModAction(btn.id as any)}
                        className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 group ${modAction === btn.id ? 'bg-chat-accent/10 border-chat-accent shadow-lg shadow-chat-accent/5' : `bg-chat-bg-primary border-chat-border ${btn.bg}`}`}
                      >
                        <btn.icon size={20} className={modAction === btn.id ? 'text-chat-accent' : btn.color} />
                        <span className={`text-[11px] font-bold ${modAction === btn.id ? 'text-chat-accent' : 'text-chat-text-secondary'}`}>{btn.label}</span>
                      </button>
                    ))}
                 </div>

                 <AnimatePresence mode="wait">
                    {modAction === 'timeout' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                         <label className="text-[10px] font-bold text-chat-text-tertiary uppercase tracking-widest flex items-center gap-2">
                           <Calendar size={12} /> Set Timeout Expiry (Custom)
                         </label>
                         <div className="relative group">
                            <input 
                              type="datetime-local" 
                              value={timeoutDate}
                              onChange={(e) => setTimeoutDate(e.target.value)}
                              className="w-full bg-chat-bg-primary border border-chat-border rounded-xl px-4 py-3 text-sm text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-chat-text-tertiary group-hover:text-amber-500 transition-colors">
                               <Clock size={16} />
                            </div>
                         </div>
                         <div className="flex gap-2">
                            {[
                              { label: '1h', val: 1 },
                              { label: '24h', val: 24 },
                              { label: '3d', val: 72 },
                              { label: '1w', val: 168 }
                            ].map(quick => (
                              <button
                                key={quick.label}
                                onClick={() => {
                                  const d = new Date();
                                  d.setHours(d.getHours() + quick.val);
                                  // Adjust for local timezone to work correctly with datetime-local input
                                  const tzOffset = d.getTimezoneOffset() * 60000;
                                  const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
                                  setTimeoutDate(localISOTime);
                                }}
                                className="px-2 py-1 bg-chat-bg-primary border border-chat-border rounded-md text-[10px] font-bold text-chat-text-tertiary hover:border-amber-500 hover:text-amber-500 transition-all"
                              >
                                +{quick.label}
                              </button>
                            ))}
                         </div>
                      </motion.div>
                    )}
                 </AnimatePresence>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-chat-text-tertiary uppercase tracking-widest">Admin Notes (Internal)</label>
                    <textarea 
                      placeholder="Enter details about this action..."
                      className="w-full bg-chat-bg-primary border border-chat-border rounded-xl px-4 py-3 text-sm text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all resize-none h-24"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                 </div>

                 <button
                   disabled={!modAction || actionLoading || (modAction === 'timeout' && !timeoutDate)}
                   onClick={handleModeration}
                   className="w-full py-4 bg-chat-accent disabled:opacity-50 disabled:cursor-not-allowed hover:bg-chat-accent/90 text-white font-bold rounded-2xl shadow-xl shadow-chat-accent/10 transition-all flex items-center justify-center gap-2 group"
                 >
                   {actionLoading ? <Loader2 className="animate-spin" /> : <ShieldAlert size={18} className="group-hover:scale-110 transition-transform" />}
                   {modAction ? `Confirm ${modAction.charAt(0).toUpperCase() + modAction.slice(1)}` : 'Select an Action'}
                 </button>
                 
                 {modAction === 'delete' && (
                   <p className="text-[10px] text-red-500 font-bold text-center flex items-center justify-center gap-1">
                     <AlertTriangle size={10} /> WARNING: This will permanently erase user data.
                   </p>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
