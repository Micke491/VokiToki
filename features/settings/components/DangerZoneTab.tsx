'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';

interface DangerZoneTabProps {
  setFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
}

export default function DangerZoneTab({ setFeedback }: DangerZoneTabProps) {
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await apiFetch(`/api/users/current_user`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete account');
      localStorage.clear();
      window.location.href = '/auth-pages/login';
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to delete account.' });
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="bg-red-500/5 backdrop-blur-2xl rounded-[2.5rem] border border-red-500/20 p-10">
      <h2 className="text-xl font-bold text-red-500 mb-6 flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        Danger Zone
      </h2>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
        <div>
          <p className="font-bold text-red-600 text-lg">Delete Account</p>
          <p className="text-sm text-red-600/80 font-medium mt-1">Permanently remove all your data, messages, and chats</p>
        </div>
        <button
          onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(''); }}
          className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 shrink-0"
        >
          <Trash2 className="w-5 h-5" />
          Delete Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !deleting && setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-chat-bg-primary border border-chat-border rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 space-y-6"
            >
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-chat-text-primary tracking-tight">Are you sure?</h3>
                  <p className="text-sm font-bold text-red-500 mt-1 uppercase tracking-widest">This cannot be undone</p>
                </div>
              </div>

              <p className="text-chat-text-secondary font-medium leading-relaxed">
                You are about to permanently delete your account. All of your data, messages, and personalized settings will be completely removed.
              </p>

              <div className="space-y-3 pt-2">
                <label className="text-sm font-bold text-chat-text-secondary">
                  Type <span className="text-red-500 font-black">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full px-4 py-3 bg-chat-input border border-red-500/30 rounded-xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono tracking-widest"
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-4 bg-chat-bg-secondary text-chat-text-primary rounded-2xl font-bold border border-chat-border disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText !== 'DELETE'}
                  className="flex-1 px-4 py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
