'use client';

import { useMemo } from 'react';
import { Loader2, Shield, Lock, Eye, EyeOff, UserX, Smartphone, Monitor } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivacySettings } from '@/features/settings/hooks/usePrivacySettings';
import BlockedUsersModal from '@/features/settings/components/BlockedUsersModal';
import Portal from '@/components/ui/Portal';

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

interface Session {
  _id: string;
  device: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

const parseDeviceLabel = (device: string): { label: string; isMobile: boolean } => {
  const ua = (device || '').trim();
  if (!ua) return { label: 'Unknown Device', isMobile: false };

  // Native apps send a friendly label (e.g. "iPhone 15 Pro (iOS 17.2)"); browser
  // sessions always carry a full User-Agent string containing "Mozilla".
  const looksLikeBrowser = /mozilla|applewebkit|gecko\/|chrome\/|version\//i.test(ua);
  if (!looksLikeBrowser) {
    const isMobile = /iphone|ipad|ipod|ios|android|mobile|pixel|galaxy|sm-/i.test(ua);
    return { label: ua, isMobile };
  }

  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (/windows/i.test(ua)) {
    os = 'Windows PC';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS Device';
  } else if (/android/i.test(ua)) {
    os = 'Android Device';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'Mac';
  } else if (/linux/i.test(ua)) {
    os = 'Linux Device';
  }

  if (/edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/opr\//i.test(ua)) {
    browser = 'Opera';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = 'Safari';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/trident/i.test(ua)) {
    browser = 'Internet Explorer';
  }

  const isMobile = /iphone|ipad|ipod|android/i.test(ua);
  return { label: `${os} (${browser})`, isMobile };
};

// Collapse sessions that resolve to the same device + IP into a single row,
// keeping the current session (or the most recently active) and listing the
// current device first — matching how large chat apps present devices.
const dedupeSessions = (sessions: Session[]): Session[] => {
  const byKey = new Map<string, Session>();
  for (const s of sessions) {
    const key = `${parseDeviceLabel(s.device).label.toLowerCase()}__${s.ip}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, s);
      continue;
    }
    const preferNew =
      s.isCurrent ||
      (!existing.isCurrent && new Date(s.lastActive).getTime() > new Date(existing.lastActive).getTime());
    if (preferNew) byKey.set(key, s);
  }
  return Array.from(byKey.values()).sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
  });
};

export default function PrivacySettingsTab({
  currentUser,
  onUserUpdate,
  setFeedback,
}: PrivacySettingsTabProps) {
  const {
    readReceipts,
    twoFactor,
    requestingPassword,
    showBlockedUsersModal,
    setShowBlockedUsersModal,
    show2FASetup,
    setShow2FASetup,
    show2FADisable,
    setShow2FADisable,
    setupCode,
    setSetupCode,
    disablePassword,
    setDisablePassword,
    verifying2FA,
    toggleReadReceipts,
    handlePasswordResetRequest,
    handleRequest2FASetup,
    handleConfirm2FASetup,
    handleDisable2FA,
    sessions,
    loadingSessions,
    revokeSession,
  } = usePrivacySettings({ currentUser, onUserUpdate, setFeedback });

  const visibleSessions = useMemo(() => dedupeSessions(sessions as Session[]), [sessions]);

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
                {readReceipts ? <Eye className="w-4 h-4 text-chat-accent" /> : <EyeOff className="w-4 h-4 text-chat-text-tertiary" />}
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
                <UserX className="w-4 h-4 text-chat-accent" /> Blocked Users
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
                <Smartphone className="w-4 h-4 text-chat-accent" />
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

      {/* Active Sessions & Device Management */}
      <div className="pt-6 border-t border-chat-border">
        <h2 className="text-xl font-bold text-chat-text-primary mb-4 flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-chat-accent" />
          Active Sessions & Devices
        </h2>
        <p className="text-sm text-chat-text-secondary mb-6">
          Logged-in devices currently holding active tokens for your profile. Revoke any unrecognized sessions.
        </p>

        {loadingSessions ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-chat-accent" />
          </div>
        ) : visibleSessions.length === 0 ? (
          <p className="text-sm text-chat-text-tertiary italic">No active session details.</p>
        ) : (
          <div className="space-y-3">
            {visibleSessions.map((session) => {
              const { label, isMobile } = parseDeviceLabel(session.device);
              const DeviceIcon = isMobile ? Smartphone : Monitor;
              return (
              <div key={session._id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-chat-input/50 border rounded-2xl ${session.isCurrent ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'border-chat-border'}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`shrink-0 mt-0.5 flex items-center justify-center w-10 h-10 rounded-xl border ${session.isCurrent ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-chat-bg-primary border-chat-border text-chat-text-secondary'}`}>
                    <DeviceIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-chat-text-primary truncate">{label}</p>
                      {session.isCurrent && (
                        <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full shrink-0">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-chat-text-tertiary mt-1.5">IP Address: {session.ip}</p>
                    <p className="text-xs text-chat-text-tertiary">Last Active: {new Date(session.lastActive).toLocaleString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => revokeSession(session._id)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all self-start sm:self-center ${
                    session.isCurrent
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500'
                      : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500'
                  }`}
                >
                  {session.isCurrent ? 'Sign Out' : 'Revoke Access'}
                </button>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Blocked Users Modal */}
      <BlockedUsersModal
        isOpen={showBlockedUsersModal}
        onClose={() => setShowBlockedUsersModal(false)}
      />

      {/* 2FA Setup Modal */}
      <Portal>
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
      </Portal>

      {/* 2FA Disable Modal */}
      <Portal>
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
      </Portal>
    </div>
  );
}