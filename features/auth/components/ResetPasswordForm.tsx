'use client';

import { Lock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useResetPassword } from '../hooks/useResetPassword';
import { Logo } from '@/components/ui/Logo';

export function ResetPasswordForm() {
  const { token } = useParams();
  const {
    password,
    setPassword,
    confirm,
    setConfirm,
    loading,
    success,
    error,
    handleSubmit,
  } = useResetPassword(token);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex items-center justify-center px-4 relative overflow-hidden selection:bg-blue-500/30">
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-[40rem] w-[100%] max-w-[60rem] bg-blue-500/10 blur-[120px] rounded-full translate-y-[-20%]"></div>
      </div>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-[440px]">
        <div className="bg-[#09090b]/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-zinc-800 p-10">
          <div className="text-center mb-10 flex flex-col items-center">
            <Link href="/" className="inline-flex items-center justify-center mb-6 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
              <Logo iconClassName="w-10 h-10 md:w-12 md:h-12" textClassName="text-2xl md:text-3xl" />
            </Link>
            <h1 className="text-3xl font-black text-zinc-100 tracking-tight mt-2">New Password</h1>
            <p className="text-zinc-400 font-medium mt-2">Create a secure password for your account</p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-zinc-100">Updated!</h3>
              <p className="text-zinc-400">Your password has been reset. Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex gap-3 items-start text-red-300 text-sm font-medium">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> <p>{error}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">New Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={20}/>
                  <input 
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-zinc-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={20}/>
                  <input 
                    type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-zinc-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button disabled={loading} className="w-full py-4 bg-blue-600 text-zinc-100 font-bold rounded-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] transform active:scale-[0.98] mt-4">
                {loading ? <Loader2 className="animate-spin" /> : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
