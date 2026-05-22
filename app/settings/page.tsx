'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import SideBar from '@/components/layout/Sidebar';
import BlockedUsersModal from '@/components/ui/BlockedUsersModal';
import {
  ArrowLeft, Trash2, Moon, Sun, AlertTriangle, Loader2,
  User as UserIcon, CheckCircle, Shield,
  Lock, Palette, EyeOff, UserX, Smartphone, Eye, Bell, BellOff, BellRing, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
  registerServiceWorker
} from '@/lib/pushNotifications';

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

type TabType = 'account' | 'privacy' | 'notifications' | 'appearance' | 'danger';

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [requestingPassword, setRequestingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [readReceipts, setReadReceipts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [requestingPermission, setRequestingPermission] = useState(false);

  // Username change configurations
  const [username, setUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [setupCode, setSetupCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    fetchCurrentUser();
    setNotifEnabled(isNotificationsEnabled());
    setNotifPermission(getNotificationPermission());
    registerServiceWorker();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await apiFetch(`/api/users/current_user`);
      if (!response.ok) throw new Error('Not authenticated');
      const data = await response.json();

      setCurrentUser(data.user);
      setUsername(data.user.username || '');
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
      const response = await apiFetch(`/api/users/preferences`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

    } catch (error: any) {
      console.error('Update pref error:', error);
      setFeedback({ type: 'error', message: 'Failed to save preference.' });
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || username === currentUser?.username) return;

    // Standard character checks
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setUsernameError('Usernames must be 3-20 characters and contain lowercase letters, numbers, or underscores.');
      return;
    }

    setCheckingUsername(true);
    setUsernameError('');
    setUsernameSuccess('');

    try {
      const response = await apiFetch(`/api/profile`, {
        method: 'PATCH',
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'This username is already taken.');
      }

      setCurrentUser((prev) => (prev ? { ...prev, username: data.user?.username || username } : null));
      setUsernameSuccess('Username has been updated successfully.');
      setFeedback({ type: 'success', message: 'Username updated!' });
    } catch (err: any) {
      setUsernameError(err.message || 'Failed to update username.');
    } finally {
      setCheckingUsername(false);
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

  const handlePasswordResetRequest = async () => {
    if (!currentUser?.email) return;
    setRequestingPassword(true);

    try {
      const response = await apiFetch(`/api/auth/password-reset-request`, {
        method: 'POST',
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

  const handleRequest2FASetup = async () => {
    setShow2FASetup(true);
    setVerifying2FA(true);
    setSetupCode('');
    try {
      const response = await apiFetch(`/api/auth/2fa/request-enable`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to send code');
      setFeedback({ type: 'success', message: 'Verification code sent to email' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Could not send verification code' });
      setShow2FASetup(false);
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleConfirm2FASetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying2FA(true);
    try {
      const response = await apiFetch(`/api/auth/2fa/confirm-enable`, {
        method: 'POST',
        body: JSON.stringify({ code: setupCode }),
      });
      if (!response.ok) throw new Error('Invalid code');
      setTwoFactor(true);
      setShow2FASetup(false);
      setFeedback({ type: 'success', message: '2FA enabled successfully' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Invalid or expired code' });
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying2FA(true);
    try {
      const response = await apiFetch(`/api/auth/2fa/disable`, {
        method: 'POST',
        body: JSON.stringify({ password: disablePassword }),
      });
      if (!response.ok) throw new Error('Incorrect password');
      setTwoFactor(false);
      setShow2FADisable(false);
      setDisablePassword('');
      setFeedback({ type: 'success', message: '2FA disabled successfully' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Incorrect password' });
    } finally {
      setVerifying2FA(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="ambient-glow">
          <div className="ambient-glow-inner" />
        </div>
        <Loader2 className="w-10 h-10 text-chat-accent animate-spin relative z-10" />
      </div>
    );
  }

  const handleToggleNotifications = () => {
    const newState = !notifEnabled;
    setNotifEnabled(newState);
    setNotificationsEnabled(newState);
  };

  const handleRequestPermission = async () => {
    setRequestingPermission(true);
    try {
      const result = await requestNotificationPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        setNotifEnabled(true);
        setNotificationsEnabled(true);
      }
    } finally {
      setRequestingPermission(false);
    }
  };

  const permissionBadge = () => {
    switch (notifPermission) {
      case 'granted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Granted
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Denied
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Not Set
          </span>
        );
    }
  };

  const TABS = [
    { id: 'account', label: 'Account Settings', icon: UserIcon, danger: false },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, danger: false },
    { id: 'notifications', label: 'Notifications', icon: Bell, danger: false },
    { id: 'appearance', label: 'Appearance', icon: Palette, danger: false },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, danger: true },
  ] as const;

  return (
    <div className="flex h-screen bg-background overflow-hidden relative selection:bg-chat-accent/30">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className="relative z-[100]">
        <SideBar 
          currentUser={currentUser || undefined} 
          isMobileDrawerOpen={false}
          onCloseMobileDrawer={() => {}}
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

      <div className="flex-1 overflow-y-auto pb-0 relative z-10 w-full">
        {/* Header */}
        <header className="px-10 py-8 max-w-6xl mx-auto border-b border-chat-border/50 mb-8">
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
          </div>
        </header>

        <div className="max-w-6xl px-4 md:px-10 mx-auto flex flex-col md:flex-row gap-4 md:gap-8 pb-12">
          {/* Settings Sub-Sidebar Menu */}
          <aside className="w-full md:w-64 shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible scrollbar-none pb-2 md:pb-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all whitespace-nowrap md:w-full ${
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
              {/* === ACCOUNT SETTINGS TAB === */}
              {activeTab === 'account' && (
                <motion.section
                  key="account"
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="bg-chat-glass backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-10 space-y-8"
                >
                  <div>
                    <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
                      <UserIcon className="w-6 h-6 text-chat-accent" />
                      Account Settings
                    </h2>

                    <form onSubmit={handleUpdateUsername} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-chat-text-secondary">
                          Change Username
                        </label>
                        <p className="text-xs text-chat-text-tertiary">
                          Customize your handle. Other users will be able to search and message you with this identifier.
                        </p>
                        <div className="relative mt-2">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-chat-text-tertiary font-bold">
                            @
                          </span>
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => {
                              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                              setUsernameError('');
                              setUsernameSuccess('');
                            }}
                            placeholder="username"
                            className="w-full pl-9 pr-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium"
                            disabled={checkingUsername}
                            maxLength={20}
                            required
                          />
                        </div>

                        {usernameError && (
                          <p className="text-sm text-red-500 font-semibold mt-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" />
                            {usernameError}
                          </p>
                        )}

                        {usernameSuccess && (
                          <p className="text-sm text-green-500 font-semibold mt-2 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" />
                            {usernameSuccess}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={checkingUsername || username === currentUser?.username || !username}
                        className="px-6 py-4 bg-chat-accent hover:bg-chat-accent-hover text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-chat-accent/20 disabled:opacity-50"
                      >
                        {checkingUsername ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                        {checkingUsername ? 'Updating Username...' : 'Update Username'}
                      </button>
                    </form>
                  </div>
                </motion.section>
              )}

              {/* === PRIVACY & SECURITY TAB === */}
              {activeTab === 'privacy' && (
                <motion.section
                  key="privacy"
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="bg-chat-glass backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-10 space-y-10"
                >
                  <div>
                    <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
                      <Shield className="w-6 h-6 text-chat-accent" />
                      Privacy Settings
                    </h2>

                    <div className="space-y-4">
                      <div className="bg-chat-input border border-chat-border rounded-2xl p-6 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-chat-text-primary text-base flex items-center gap-2">
                            {readReceipts ? <Eye className="w-4 h-4 text-chat-accent"/> : <EyeOff className="w-4 h-4 text-chat-text-tertiary"/>}
                            Read Receipts
                          </h3>
                          <p className="text-sm text-chat-text-secondary mt-1 max-w-sm">
                            If turned off, you won&apos;t send read receipts. You also won&apos;t be able to see read receipts from other people.
                          </p>
                        </div>
                        <button
                          onClick={toggleReadReceipts}
                          role="switch"
                          aria-checked={readReceipts}
                          aria-label="Toggle read receipts"
                          className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${readReceipts ? 'bg-chat-accent' : 'bg-chat-border'}`}
                        >
                          <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${readReceipts ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

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

                  <div>
                    <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3 pt-6 border-t border-chat-border">
                      <Lock className="w-6 h-6 text-chat-accent" />
                      Security
                    </h2>

                    <div className="space-y-4">
                      <div className="bg-chat-input border border-chat-border rounded-2xl p-6 flex flex-row items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-chat-text-primary text-base">Account Password</h3>
                          <p className="text-sm text-chat-text-secondary mt-1">Request a password change via your registered email address.</p>
                        </div>
                        <button
                          onClick={handlePasswordResetRequest}
                          disabled={requestingPassword}
                          className="px-5 py-2.5 bg-chat-bg-primary border border-chat-border hover:border-chat-accent text-chat-text-primary font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap w-auto"
                        >
                          {requestingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                          {requestingPassword ? 'Sending...' : 'Change Password'}
                        </button>
                      </div>

                      <div className="bg-chat-input border border-chat-border rounded-2xl p-6 flex flex-row items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-chat-text-primary text-base flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-chat-accent"/>
                            Two-Step Verification (2FA)
                          </h3>
                          <p className="text-sm text-chat-text-secondary mt-1">
                            Add an extra layer of security requiring an email code to log in.
                          </p>
                        </div>
                        <div className="relative group">
                          {twoFactor ? (
                            <button
                              onClick={() => { setShow2FADisable(true); setDisablePassword(''); }}
                              className="px-5 py-2.5 font-bold rounded-xl transition-all text-sm whitespace-nowrap w-auto bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20"
                            >
                              Configured (Disable)
                            </button>
                          ) : (
                            <button
                              onClick={handleRequest2FASetup}
                              className="px-5 py-2.5 font-bold rounded-xl transition-all text-sm whitespace-nowrap w-auto bg-chat-bg-primary border border-chat-border hover:border-chat-accent text-chat-text-primary"
                            >
                              Setup 2FA
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* === NOTIFICATIONS TAB === */}
              {activeTab === 'notifications' && (
                <motion.section
                  key="notifications"
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="bg-chat-glass backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-10 space-y-10"
                >
                  <div>
                    <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
                      <Bell className="w-6 h-6 text-chat-accent" />
                      Notification Preferences
                    </h2>

                    <div className="space-y-4">
                      <div className="bg-chat-input border border-chat-border rounded-2xl p-6 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-chat-text-primary text-base flex items-center gap-2">
                            {notifEnabled ? <BellRing className="w-4 h-4 text-chat-accent"/> : <BellOff className="w-4 h-4 text-chat-text-tertiary"/>}
                            Push Notifications
                          </h3>
                          <p className="text-sm text-chat-text-secondary mt-1 max-w-sm">
                            Receive browser notifications for new messages and incoming calls.
                          </p>
                        </div>
                        <button
                          onClick={handleToggleNotifications}
                          role="switch"
                          aria-checked={notifEnabled}
                          aria-label="Toggle push notifications"
                          className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${notifEnabled ? 'bg-chat-accent' : 'bg-chat-border'}`}
                        >
                          <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${notifEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <div className="bg-chat-input border border-chat-border rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-chat-text-primary text-base flex items-center gap-2">
                              <Shield className="w-4 h-4 text-chat-accent"/>
                              Browser Permission
                            </h3>
                            <p className="text-sm text-chat-text-secondary mt-1">
                              Your browser&apos;s notification permission status.
                            </p>
                          </div>
                          {permissionBadge()}
                        </div>

                        {notifPermission !== 'granted' && (
                          <button
                            onClick={handleRequestPermission}
                            disabled={requestingPermission || notifPermission === 'denied'}
                            className="w-full px-5 py-3 bg-chat-accent text-white font-bold rounded-xl transition-all hover:bg-chat-accent-hover shadow-lg shadow-chat-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {requestingPermission ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Bell className="w-4 h-4" />
                            )}
                            {notifPermission === 'denied'
                              ? 'Permission Denied — Update in Browser Settings'
                              : 'Request Permission'
                            }
                          </button>
                        )}

                        {notifPermission === 'denied' && (
                          <p className="text-xs text-red-400 font-medium">
                            You have blocked notifications. To re-enable, click the lock icon in your browser&apos;s address bar and allow notifications.
                          </p>
                        )}
                      </div>

                      <div className="bg-chat-accent/5 border border-chat-accent/15 rounded-2xl p-5 flex items-start gap-3">
                        <Info className="w-5 h-5 text-chat-accent shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-chat-text-secondary font-medium leading-relaxed">
                            <strong className="text-chat-text-primary">How it works:</strong> Message notifications only appear when the app tab is in the background or minimized. Call notifications always appear, even when the tab is active.
                          </p>
                        </div>
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
                  className="bg-chat-glass backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-10"
                >
                  <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
                    <Palette className="w-6 h-6 text-chat-accent" />
                    Appearance Preference
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
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
                  className="bg-red-500/5 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-red-500/20 p-10"
                >
                  <h2 className="text-xl font-bold text-red-500 mb-6 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                    Danger Zone
                  </h2>
                  <div className="flex flex-row items-center justify-between gap-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
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

      {/* Blocked Users Modal */}
      <BlockedUsersModal
        isOpen={showBlockedUsersModal}
        onClose={() => setShowBlockedUsersModal(false)}
      />

      {/* 2FA Setup Modal */}
      <AnimatePresence>
        {show2FASetup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !verifying2FA && setShow2FASetup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-chat-bg-primary border border-chat-border rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-chat-accent/10 border border-chat-accent/20 rounded-2xl mb-4">
                  <Smartphone className="w-8 h-8 text-chat-accent" />
                </div>
                <h3 className="text-2xl font-black text-chat-text-primary tracking-tight">Enable 2FA</h3>
                <p className="text-sm font-medium text-chat-text-secondary mt-2">
                  We&apos;ve sent a 6-digit code to your email. Enter it below to enable Two-Step Verification.
                </p>
              </div>

              <form onSubmit={handleConfirm2FASetup} className="space-y-6">
                <div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    disabled={verifying2FA}
                    className="w-full text-center tracking-[0.5em] text-3xl font-black py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all placeholder-chat-text-tertiary"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={verifying2FA || setupCode.length !== 6}
                    className="w-full py-4 bg-chat-accent text-white font-bold rounded-2xl hover:bg-chat-accent-hover transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {verifying2FA ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShow2FASetup(false)}
                    disabled={verifying2FA}
                    className="w-full py-4 bg-transparent text-chat-text-secondary hover:text-chat-text-primary font-bold rounded-2xl transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2FA Disable Modal */}
      <AnimatePresence>
        {show2FADisable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !verifying2FA && !requestingPassword && setShow2FADisable(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-chat-bg-primary border border-chat-border rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4">
                  <Lock className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-chat-text-primary tracking-tight">Disable 2FA</h3>
                <p className="text-sm font-medium text-chat-text-secondary mt-2">
                  Please enter your password to disable Two-Step Verification.
                </p>
              </div>

              <form onSubmit={handleDisable2FA} className="space-y-6">
                <div>
                  <input
                    type="password"
                    required
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={verifying2FA || requestingPassword}
                    className="w-full px-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-medium"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      disabled={requestingPassword || verifying2FA}
                      onClick={async () => {
                        setShow2FADisable(false);
                        await handlePasswordResetRequest();
                      }}
                      className="text-xs font-bold text-chat-accent hover:underline disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {requestingPassword && <Loader2 className="w-3 h-3 animate-spin" />}
                      Forgot password?
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={verifying2FA || requestingPassword || disablePassword.length === 0}
                    className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {verifying2FA ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Disable 2FA'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShow2FADisable(false)}
                    disabled={verifying2FA || requestingPassword}
                    className="w-full py-4 bg-transparent text-chat-text-secondary hover:text-chat-text-primary font-bold rounded-2xl transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}