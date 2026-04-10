'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SideBar from '@/components/layout/Sidebar';
import BlockedUsersModal from '@/components/ui/BlockedUsersModal';
import {
  ArrowLeft, Camera, Trash2, Moon, Sun, AlertTriangle, Loader2,
  User as UserIcon, Image as ImageIcon, CheckCircle, Shield,
  Lock, Palette, EyeOff, UserX, Smartphone, Eye, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  _id: string;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  readReceipts: boolean;
  twoFactorEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

type TabType = 'personal' | 'privacy' | 'appearance' | 'danger';

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [requestingPassword, setRequestingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSidebarDrawer, setShowSidebarDrawer] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [readReceipts, setReadReceipts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/current_user', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Not authenticated');
      const data = await response.json();

      setCurrentUser(data.user);
      setEditUsername(data.user.username || '');
      setBio(data.user.bio || '');
      setAvatarUrl(data.user.avatar || '');

      setReadReceipts(data.user.readReceipts ?? true);
      setTwoFactor(data.user.twoFactorEnabled ?? false);

      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
      const userTheme = data.user.theme === 'system' ? savedTheme : (data.user.theme || savedTheme);
      setTheme(userTheme);
      document.documentElement.setAttribute('data-theme', userTheme);

    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/auth-pages/login');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (updates: Partial<User>) => {
    try {
      const response = await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

    } catch (error: any) {
      console.error('Update pref error:', error);
      setFeedback({ type: 'error', message: 'Failed to save preference.' });
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    handleUpdatePreferences({ theme: newTheme });
  };

  const toggleReadReceipts = () => {
    const newState = !readReceipts;
    setReadReceipts(newState);
    handleUpdatePreferences({ readReceipts: newState });
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
          username: editUsername,
          bio: bio,
          avatar: avatarUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');

      setCurrentUser(data.user);
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setFeedback({ type: 'error', message: error.message || 'Failed to save changes.' });
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
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload image');
      const data = await response.json();
      setAvatarUrl(data.url);
      setFeedback({ type: 'success', message: 'Avatar updated successfully!' });
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to upload.' });
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    if (!currentUser?.email) return;
    setRequestingPassword(true);

    try {
      const response = await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email }),
      });

      if (!response.ok) throw new Error('Failed to send request');
      setFeedback({ type: 'success', message: 'Password reset link sent to your email.' });
    } catch (error) {
      setFeedback({ type: 'error', message: 'Could not send request. Try again.' });
    } finally {
      setRequestingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/users/current_user', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="ambient-glow">
          <div className="ambient-glow-inner" />
        </div>
        <Loader2 className="w-10 h-10 text-chat-accent animate-spin relative z-10" />
      </div>
    );
  }

  const TABS = [
    { id: 'personal', label: 'Personal Info', icon: UserIcon, danger: false },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, danger: false },
    { id: 'appearance', label: 'Appearance', icon: Palette, danger: false },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, danger: true },
  ] as const;

  return (
    <div className="flex h-screen bg-background overflow-hidden relative selection:bg-chat-accent/30">
      {/* Signature Ambient Gradient */}
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className={`${!showSidebarDrawer ? "hidden md:block" : "block"} relative z-[100]`}>
        <SideBar 
          currentUser={currentUser || undefined} 
          isMobileDrawerOpen={showSidebarDrawer}
          onCloseMobileDrawer={() => setShowSidebarDrawer(false)}
        />
      </div>

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

      <div className="flex-1 overflow-y-auto pb-20 md:pb-0 relative z-10 w-full">
        {/* Header */}
        <header className="px-6 py-8 md:px-10 max-w-6xl mx-auto border-b border-chat-border/50 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/chat')}
              className="p-3 bg-chat-bg-secondary hover:bg-chat-hover border border-chat-border rounded-2xl text-chat-text-primary transition-all hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-chat-text-primary tracking-tight">Settings</h1>
              <p className="text-chat-text-secondary font-medium mt-1">Manage your preferences and account</p>
            </div>
            <button
              onClick={() => setShowSidebarDrawer(true)}
              className="md:hidden p-3 bg-chat-bg-secondary hover:bg-chat-hover border border-chat-border rounded-2xl text-chat-text-primary transition-all ml-auto"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="max-w-6xl px-6 md:px-10 mx-auto flex flex-col md:flex-row gap-8 pb-12">

          {/* Settings Sub-Sidebar Menu */}
          <aside className="w-full md:w-64 shrink-0 space-y-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all ${
                    isActive
                      ? tab.danger
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                        : 'bg-chat-accent text-white shadow-lg shadow-chat-accent/20'
                      : 'text-chat-text-secondary hover:bg-chat-bg-secondary hover:text-chat-text-primary border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </aside>

          {/* Main Settings Content Area */}
          <main className="flex-1 max-w-3xl">
            <AnimatePresence mode="wait">

              {/* === PERSONAL TAB === */}
              {activeTab === 'personal' && (
                <motion.section
                  key="personal"
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="bg-chat-glass backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-8 md:p-10"
                >
                  <h2 className="text-xl font-bold text-chat-text-primary mb-8 flex items-center gap-3">
                    <UserIcon className="w-6 h-6 text-chat-accent" />
                    Personal Information
                  </h2>

                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 pb-8 border-b border-chat-border mb-8">
                    <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-tr from-chat-accent to-chat-accent-secondary flex items-center justify-center text-4xl font-black text-white shadow-xl overflow-hidden ring-4 ring-chat-bg-secondary shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        currentUser?.username?.charAt(0).toUpperCase() || 'U'
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 text-center sm:text-left">
                      <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                      <button
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        disabled={uploading}
                        className="px-6 py-3 bg-chat-input border border-chat-border hover:bg-chat-hover rounded-xl text-sm font-bold text-chat-text-primary transition-all flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        {uploading ? 'Uploading...' : 'Change Avatar'}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    {/* Editable Username */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1">Username</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-chat-text-tertiary group-focus-within:text-chat-accent transition-colors" />
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium"
                        />
                      </div>
                    </div>

                    {/* Bio field */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1">Bio</label>
                      <textarea
                        placeholder="Tell us a bit about yourself..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="w-full p-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary placeholder-chat-text-tertiary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all font-medium resize-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="mt-8 w-full sm:w-auto px-8 py-4 bg-chat-accent text-white font-black rounded-2xl hover:bg-chat-accent-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-chat-accent/20"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </motion.section>
              )}

              {/* === PRIVACY & SECURITY TAB === */}
              {activeTab === 'privacy' && (
                <motion.section
                  key="privacy"
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="bg-chat-glass backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-8 md:p-10 space-y-10"
                >
                  {/* Privacy Section */}
                  <div>
                    <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
                      <Shield className="w-6 h-6 text-chat-accent" />
                      Privacy Settings
                    </h2>

                    <div className="space-y-4">
                      {/* Read Receipts Toggle */}
                      <div className="bg-chat-input border border-chat-border rounded-2xl p-6 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-chat-text-primary text-base flex items-center gap-2">
                            {readReceipts ? <Eye className="w-4 h-4 text-chat-accent"/> : <EyeOff className="w-4 h-4 text-chat-text-tertiary"/>}
                            Read Receipts
                          </h3>
                          <p className="text-sm text-chat-text-secondary mt-1 max-w-sm">
                            If turned off, you won't send read receipts. You also won't be able to see read receipts from other people.
                          </p>
                        </div>
                        <button
                          onClick={toggleReadReceipts}
                          className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${readReceipts ? 'bg-chat-accent' : 'bg-chat-border'}`}
                        >
                          <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${readReceipts ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Blocked Users */}
                      <div className="bg-chat-input border border-chat-border rounded-2xl p-6 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-chat-text-primary text-base flex items-center gap-2">
                            <UserX className="w-4 h-4 text-chat-accent"/> Blocked Users
                          </h3>
                          <p className="text-sm text-chat-text-secondary mt-1">
                            Manage contacts you have blocked from messaging you.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowBlockedUsersModal(true)}
                          className="px-5 py-2.5 bg-chat-bg-primary border border-chat-border hover:border-chat-accent text-chat-text-primary font-bold rounded-xl transition-all text-sm whitespace-nowrap"
                        >
                          Manage List
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div>
                    <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3 pt-6 border-t border-chat-border">
                      <Lock className="w-6 h-6 text-chat-accent" />
                      Security
                    </h2>

                    <div className="space-y-4">
                      {/* Password Reset */}
                      <div className="bg-chat-input border border-chat-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-chat-text-primary text-base">Account Password</h3>
                          <p className="text-sm text-chat-text-secondary mt-1">Request a password change via your registered email address.</p>
                        </div>
                        <button
                          onClick={handlePasswordResetRequest}
                          disabled={requestingPassword}
                          className="px-5 py-2.5 bg-chat-bg-primary border border-chat-border hover:border-chat-accent text-chat-text-primary font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap w-full sm:w-auto"
                        >
                          {requestingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                          {requestingPassword ? 'Sending...' : 'Change Password'}
                        </button>
                      </div>

                      {/* Two-Factor Authentication (2FA) */}
                      <div className="bg-chat-input border border-chat-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-chat-text-primary text-base flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-chat-accent"/>
                            Two-Step Verification (2FA)
                          </h3>
                          <p className="text-sm text-chat-text-secondary mt-1">
                            Add an extra layer of security requiring an Authenticator app code to log in.
                          </p>
                        </div>
                        <button
                          onClick={() => {/* Implement 2FA setup route */}}
                          className={`px-5 py-2.5 font-bold rounded-xl transition-all text-sm whitespace-nowrap w-full sm:w-auto ${
                            twoFactor
                              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                              : 'bg-chat-accent text-white hover:bg-chat-accent-hover shadow-lg shadow-chat-accent/20'
                          }`}
                        >
                          {twoFactor ? 'Configured' : 'Setup 2FA'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* === APPEARANCE TAB === */}
              {activeTab === 'appearance' && (
                <motion.section
                  key="appearance"
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="bg-chat-glass backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-8 md:p-10"
                >
                  <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
                    <Palette className="w-6 h-6 text-chat-accent" />
                    Appearance Preference
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${theme === 'light' ? 'border-chat-accent bg-chat-accent/10 shadow-lg shadow-chat-accent/10' : 'border-chat-border bg-chat-input hover:bg-chat-hover'}`}
                    >
                      <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`} />
                      <span className={`text-sm font-bold uppercase tracking-widest ${theme === 'light' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`}>Light Mode</span>
                    </button>

                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${theme === 'dark' ? 'border-chat-accent bg-chat-accent/10 shadow-lg shadow-chat-accent/10' : 'border-chat-border bg-chat-input hover:bg-chat-hover'}`}
                    >
                      <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`} />
                      <span className={`text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`}>Dark Mode</span>
                    </button>
                  </div>
                </motion.section>
              )}

              {/* === DANGER ZONE TAB === */}
              {activeTab === 'danger' && (
                <motion.section
                  key="danger"
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="bg-red-500/5 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-red-500/20 p-8 md:p-10"
                >
                  <h2 className="text-xl font-bold text-red-500 mb-6 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                    Danger Zone
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                    <div>
                      <p className="font-bold text-red-600 text-lg">Delete Account</p>
                      <p className="text-sm text-red-600/80 font-medium mt-1">Permanently remove all your data, messages, and chats</p>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                      Delete Account
                    </button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </main>
        </div>
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
                  disabled={deleting}
                  className="flex-1 px-4 py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Blocked Users Modal */}
      <BlockedUsersModal
        isOpen={showBlockedUsersModal}
        onClose={() => setShowBlockedUsersModal(false)}
      />
    </div>
  );
}
