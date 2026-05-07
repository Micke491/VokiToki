"use client";

import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch(`/api/auth/password-reset-request`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex items-center justify-center px-4 relative overflow-hidden selection:bg-blue-500/30">
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-[40rem] w-[100%] max-w-[60rem] bg-blue-500/10 blur-[120px] rounded-full translate-y-[-20%]"></div>
      </div>
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-[440px]">
        <div className="bg-[#09090b]/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-zinc-800 p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20 mb-6">
              <MessageCircle className="w-8 h-8 text-zinc-100" />
            </div>
            <h1 className="text-3xl font-black text-zinc-100 tracking-tight">Recover Access</h1>
            <p className="text-zinc-400 font-medium mt-2">Enter your email to reset your password</p>
          </div>

          {success ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-green-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">Check your inbox</h3>
              <p className="text-zinc-400 text-sm mb-8">If an account exists for {email}, you'll receive a link shortly.</p>
              <Link href="/auth-pages/login" className="text-zinc-100 font-bold flex items-center justify-center gap-2 hover:text-blue-400 transition-colors">
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={20}/>
                  <input 
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-zinc-500"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button disabled={loading} className="w-full py-4 bg-blue-600 text-zinc-100 font-bold rounded-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] transform active:scale-[0.98]">
                {loading ? <Loader2 className="animate-spin" /> : 'Send Recovery Link'}
              </button>
              <Link href="/auth-pages/login" className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm font-bold">
                <ArrowLeft size={14} /> Nevermind, I remembered
              </Link>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}