"use client";

import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-transparent to-indigo-900/20" />
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-[440px]">
        <div className="bg-slate-900/50 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-white/5 rounded-2xl mb-6">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Recover Access</h1>
            <p className="text-slate-400 font-medium mt-2">Enter your email to reset your password</p>
          </div>

          {success ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-green-400 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Check your inbox</h3>
              <p className="text-slate-400 text-sm mb-8">If an account exists for {email}, you'll receive a link shortly.</p>
              <Link href="/auth-pages/login" className="text-white font-bold flex items-center justify-center gap-2">
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
                  <input 
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button disabled={loading} className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5">
                {loading ? <Loader2 className="animate-spin" /> : 'Send Recovery Link'}
              </button>
              <Link href="/auth-pages/login" className="flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold">
                <ArrowLeft size={14} /> Nevermind, I remembered
              </Link>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}