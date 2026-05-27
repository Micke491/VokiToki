'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

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

interface UsePrivacySettingsProps {
  currentUser: User;
  onUserUpdate: (updatedUser: User) => void;
  setFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
}

export function usePrivacySettings({
  currentUser,
  onUserUpdate,
  setFeedback,
}: UsePrivacySettingsProps) {
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

  return {
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
  };
}
