'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function useResetPassword(token: string | string[] | undefined) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await apiFetch(`/api/auth/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) throw new Error('Invalid or expired reset link');
      setSuccess(true);
      setTimeout(() => router.push('/auth-pages/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return {
    password,
    setPassword,
    confirm,
    setConfirm,
    loading,
    success,
    error,
    handleSubmit,
  };
}