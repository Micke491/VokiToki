"use client";

import { useState, useEffect } from 'react';
import { Lock, Loader2, CheckCircle, MessageCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/forgot-reset/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      });
      if (!res.ok) throw new Error('Invalid token or expired');
      setSuccess(true);
      setTimeout(() => router.push('/auth-pages/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1),transparent_50%)]" />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-[440px]">
        <div className="bg-slate-900/50 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10">
          <div className="text-center mb-10">
            <div className="inline-flex p-4 bg-purple-600 rounded-2xl mb-6 shadow-lg shadow-purple-500/20">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">New Password</h1>
            <p className="text-slate-400 font-medium mt-2">Create a secure password for your account</p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white">Updated!</h3>
              <p className="text-slate-400">Your password has been reset. Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex gap-3 items-center text-red-400 text-sm font-bold">
                  <AlertTriangle size={18} /> {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-800/50 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                <input 
                  type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-800/50 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button disabled={loading} className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5 mt-4">
                {loading ? <Loader2 className="animate-spin" /> : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}