'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shield, Lock, Eye, EyeOff, UserX, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import BlockedUsersModal from '@/components/ui/BlockedUsersModal';

interface User {
  _id: string;
  username: string;
  email: string;
  name?: string;
  bio?: string;
  avatar?: string;
  gender?: string;
  location?: string;
  links?: { label: string; url: string }[];
  readReceipts: boolean;
  twoFactorEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface PrivacySettingsTabProps {
  currentUser: User;
  onUserUpdate: (updatedUser: User) => void;
  setFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
}

export default function PrivacySettingsTab({
  currentUser,
  onUserUpdate,
  setFeedback,
}: PrivacySettingsTabProps) {
  const [readReceipts, setReadReceipts] = useState(currentUser.readReceipts ?? true);
  const [twoFactor, setTwoFactor] = useState(currentUser.twoFactorEnabled ?? false);
  const [requestingPassword, setRequestingPassword] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [setupCode, setSetupCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);

  useEffect(() => {
    setReadReceipts(currentUser.readReceipts ?? true);
    setTwoFactor(currentUser.twoFactorEnabled ?? false);
  }, [currentUser]);

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

  const toggleReadReceipts = () => {
    const newState = !readReceipts;
    setReadReceipts(newState);
    onUserUpdate({ ...currentUser, readReceipts: newState });
    handleUpdatePreferences({ readReceipts: newState });
  };

  const handlePasswordResetRequest = async () => {
    if (!currentUser.email) return;
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
      onUserUpdate({ ...currentUser, twoFactorEnabled: true });
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
      onUserUpdate({ ...currentUser, twoFactorEnabled: false });
      setShow2FADisable(false);
      setDisablePassword('');
      setFeedback({ type: 'success', message: '2FA disabled successfully' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Incorrect password' });
    } finally {
      setVerifying2FA(false);
    }
  };

  return (
    <div className="space-y-10">
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
