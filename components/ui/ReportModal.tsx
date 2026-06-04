'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, ShieldAlert, Send, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'react-hot-toast';
import Portal from './Portal';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'user' | 'message' | 'story';
  targetName?: string;
}

const CATEGORIES = [
  'Spam',
  'Harassment',
  'Abuse',
  'Inappropriate Content',
  'Hate Speech',
  'Fake Account',
  'Other'
];

export default function ReportModal({
  isOpen,
  onClose,
  targetId,
  targetType,
  targetName
}: ReportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    if (selectedCategory === 'Other' && !details.trim()) {
      toast.error('Please provide more details for "Other"');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch(`/api/reports`, {
        method: 'POST',
        body: JSON.stringify({
          targetId,
          targetType,
          category: selectedCategory,
          details: details.trim() || undefined,
        }),
      });

      if (response.ok) {
        toast.success('Report submitted successfully. Thank you.');
        onClose();
        setSelectedCategory(null);
        setDetails('');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Report submission error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-chat-bg-primary rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden border border-chat-border flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-chat-border flex items-center justify-between bg-chat-bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <ShieldAlert className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-chat-text-primary">Report {targetType}</h2>
                      <p className="text-xs text-chat-text-tertiary">Help us keep the community safe</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-chat-hover rounded-full text-chat-text-tertiary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                  {!selectedCategory ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-chat-text-secondary mb-2">
                        Why are you reporting {targetName ? <b>{targetName}</b> : `this ${targetType}`}?
                      </p>
                      {CATEGORIES.map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className="group w-full flex items-center justify-between p-4 rounded-xl border border-chat-border bg-chat-bg-secondary/30 hover:bg-chat-accent/5 hover:border-chat-accent/30 transition-all text-left"
                        >
                          <span className="text-sm font-medium text-chat-text-primary group-hover:text-chat-accent transition-colors">
                            {category}
                          </span>
                          <ChevronRight className="w-4 h-4 text-chat-text-tertiary group-hover:text-chat-accent group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col gap-4"
                    >
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-xs text-chat-accent hover:underline mb-1 flex items-center gap-1"
                      >
                        ← Back to categories
                      </button>
                      
                      <div className="p-4 rounded-xl bg-chat-accent/5 border border-chat-accent/20">
                        <p className="text-xs font-bold text-chat-accent uppercase tracking-wider mb-1">Category</p>
                        <p className="text-sm font-medium text-chat-text-primary">{selectedCategory}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-chat-text-secondary">
                          {selectedCategory === 'Other' ? 'Please describe the problem' : 'Additional details (optional)'}
                        </label>
                        <textarea
                          value={details}
                          onChange={(e) => setDetails(e.target.value)}
                          placeholder="Type here..."
                          className="w-full min-h-[120px] p-4 bg-chat-input border border-chat-border rounded-xl focus:ring-2 focus:ring-chat-accent/20 focus:border-chat-accent outline-none text-sm text-chat-text-primary placeholder-chat-text-tertiary transition-all resize-none"
                        />
                      </div>

                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-chat-accent hover:bg-chat-accent-hover text-white rounded-xl font-bold transition-all shadow-lg shadow-chat-accent/20 disabled:opacity-50 active:scale-[0.98]"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit Report
                          </>
                        )}
                      </button>
                      
                      <p className="text-[10px] text-center text-chat-text-tertiary px-4 leading-relaxed">
                        Our moderation team will review this report as soon as possible. False reporting may lead to account restrictions.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
