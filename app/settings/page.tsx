'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SideBar from '@/components/layout/Sidebar';
import { 
  ArrowLeft, 
  Camera, 
  Trash2, 
  Moon, 
  Sun, 
  AlertTriangle, 
  Loader2, 
  User, 
  Mail, 
  Image as ImageIcon, 
  CheckCircle, 
  Shield 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  _id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const[currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const[showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    fetchCurrentUser();
    loadSettings();
  },[]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/current_user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Not authenticated');
      const data = await response.json();
      setCurrentUser(data.user);
      setDisplayName(data.user.name || '');
      setAvatarUrl(data.user.avatar || '');
    } catch (error) {
      console.error('Error fetching user:', error);
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = () => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
    const savedNotifications = localStorage.getItem('notifications') !== 'false';
    const savedSound = localStorage.getItem('soundEnabled') !== 'false';

    setTheme(savedTheme);
    setNotifications(savedNotifications);
    setSoundEnabled(savedSound);
    applyTheme(savedTheme);
  };

  const applyTheme = (selectedTheme: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', selectedTheme);
    localStorage.setItem('theme', selectedTheme);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/users/current_user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: displayName,
          avatar: avatarUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      setCurrentUser(data.user);
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error saving profile:', error);
      setFeedback({ type: 'error', message: 'Failed to save profile changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/users/profile/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await response.json();
      setAvatarUrl(data.url);
      setFeedback({ type: 'success', message: 'Avatar updated successfully!' });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setFeedback({ type: 'error', message: error.message || 'Failed to upload profile picture.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/users/current_user', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      localStorage.removeItem('token');
      localStorage.removeItem('theme');
      localStorage.removeItem('notifications');
      localStorage.removeItem('soundEnabled');
      window.location.href = '/auth-pages/login';
    } catch (error) {
      console.error('Error deleting account:', error);
      setFeedback({ type: 'error', message: 'Failed to delete account. Please try again.' });
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/auth-pages/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 dark:opacity-20 animate-pulse" />
        <Loader2 className="w-10 h-10 text-chat-accent animate-spin relative z-10" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative selection:bg-chat-accent/30">
      {/* Background Orbs */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 dark:opacity-20 animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 dark:opacity-20 animate-pulse delay-700 pointer-events-none" />

      <SideBar currentUser={currentUser || undefined} />

      {/* Toast Notification */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl"
            style={{
              backgroundColor: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderColor: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: feedback.type === 'success' ? '#22c55e' : '#ef4444'
            }}
          >
            {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="font-bold tracking-tight">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0 relative z-10">
        
        {/* Header */}
        <header className="px-6 py-8 md:px-10 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/chat')}
              className="p-3 bg-chat-bg-secondary hover:bg-chat-hover border border-chat-border rounded-2xl text-chat-text-primary transition-all hover:scale-105 active:scale-95"
              aria-label="Back to chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-chat-text-primary tracking-tight">Account Settings</h1>
              <p className="text-chat-text-secondary font-medium mt-1">Manage your profile and preferences</p>
            </div>
          </div>
        </header>

        <div className="max-w-4xl px-6 md:px-10 mx-auto space-y-8 pb-12">
          
          {/* Profile Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-chat-bg-primary/50 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-8 md:p-10"
          >
            <h2 className="text-xl font-bold text-chat-text-primary mb-8 flex items-center gap-3">
              <User className="w-6 h-6 text-chat-accent" />
              Profile
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 pb-8 border-b border-chat-border mb-8">
              <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-tr from-chat-accent to-chat-accent-secondary flex items-center justify-center text-4xl font-black text-white shadow-xl overflow-hidden ring-4 ring-chat-bg-secondary shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.username?.charAt(0).toUpperCase() || 'U'
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 text-center sm:text-left">
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
                <button 
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  disabled={uploading}
                  className="px-6 py-3 bg-chat-bg-secondary border border-chat-border hover:bg-chat-hover rounded-xl text-sm font-bold text-chat-text-primary transition-all disabled:opacity-50 flex items-center justify-center sm:justify-start gap-2 shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Change Avatar'}
                </button>
                <p className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary mt-2">
                  Recommended: Square, Max 10MB
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1">Username</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-chat-text-tertiary" />
                  <input 
                    type="text" 
                    value={currentUser?.username || ''} 
                    disabled 
                    className="w-full pl-12 pr-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary cursor-not-allowed font-medium shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-chat-text-tertiary" />
                  <input 
                    type="email" 
                    value={currentUser?.email || ''} 
                    disabled 
                    className="w-full pl-12 pr-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary cursor-not-allowed font-medium shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1">Display Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-chat-text-tertiary group-focus-within:text-chat-accent transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Enter display name" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-primary placeholder-chat-text-tertiary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all font-medium shadow-inner"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveProfile}
              disabled={saving}
              className="mt-8 w-full sm:w-auto px-8 py-4 bg-chat-accent text-white font-black rounded-2xl hover:opacity-90 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-chat-accent/20"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </motion.section>

          {/* Appearance Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-chat-bg-primary/50 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-8 md:p-10"
          >
            <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
              <ImageIcon className="w-6 h-6 text-chat-accent" />
              Appearance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => handleThemeChange('light')}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${theme === 'light' ? 'border-chat-accent bg-chat-accent/10' : 'border-chat-border bg-chat-bg-secondary hover:bg-chat-hover hover:border-chat-accent/20'}`}
              >
                <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`} />
                <span className={`text-sm font-bold uppercase tracking-widest ${theme === 'light' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`}>Light Mode</span>
              </button>

              <button 
                onClick={() => handleThemeChange('dark')}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${theme === 'dark' ? 'border-chat-accent bg-chat-accent/10' : 'border-chat-border bg-chat-bg-secondary hover:bg-chat-hover hover:border-chat-accent/20'}`}
              >
                <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`} />
                <span className={`text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`}>Dark Mode</span>
              </button>
            </div>
          </motion.section>

          {/* Danger Zone */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-red-500/5 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-red-500/20 p-8 md:p-10"
          >
            <h2 className="text-xl font-bold text-red-500 mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              Danger Zone
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
              <div>
                <p className="font-bold text-red-600 dark:text-red-200 text-lg">Delete Account</p>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 font-medium mt-1">Permanently remove all your data, messages, and chats</p>
              </div>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transform active:scale-95 shrink-0"
              >
                <Trash2 className="w-5 h-5" />
                Delete Account
              </button>
            </div>
          </motion.section>

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !deleting && setShowDeleteConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
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
                You are about to permanently delete your account. All of your data, messages, and personalized settings will be completely removed from our servers.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-4 bg-chat-bg-secondary hover:bg-chat-hover text-chat-text-primary rounded-2xl font-bold transition-all border border-chat-border disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 px-4 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black transition-all shadow-lg shadow-red-500/25 disabled:opacity-50 flex items-center justify-center gap-2 transform active:scale-[0.98]"
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