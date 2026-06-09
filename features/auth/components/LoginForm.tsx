'use client';

import { MessageCircle, Mail, Lock, AlertCircle, Loader2, EyeOff, Eye, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useLogin } from '../hooks/useLogin';
import { useSessionCheck } from '../hooks/useSessionCheck';

export function LoginForm() {
  const { checking } = useSessionCheck();
  const {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,
    error,
    setError,
    loading,
    show2FAModal,
    setShow2FAModal,
    twoFaCode,
    setTwoFaCode,
    rememberDevice,
    setRememberDevice,
    verifying2FA,
    handleSubmit,
    handleVerify2FA,
  } = useLogin();

  if (checking) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex items-center justify-center px-4 relative overflow-hidden selection:bg-blue-500/30">
      {/* Background Ambient Gradient */}
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-[40rem] w-[100%] max-w-[60rem] bg-blue-500/10 blur-[120px] rounded-full translate-y-[-20%]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[440px]"
      >
        <div className="bg-[#09090b]/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-zinc-800 p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20 mb-6">
              <MessageCircle className="w-8 h-8 text-zinc-100" />
            </div>
            <h1 className="text-3xl font-black text-zinc-100 tracking-tight">Welcome Back</h1>
            <p className="text-zinc-400 font-medium mt-2">Sign in to continue to VokiToki</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Password</label>
              
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-zinc-800 rounded-lg group-hover:border-blue-500/50 transition-colors peer-checked:border-blue-500 peer-checked:bg-blue-500"></div>
                  <CheckCircle size={14} className="absolute text-white scale-0 peer-checked:scale-100 transition-transform" />
                </div>
                <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Remember Me</span>
              </label>
              <Link href="/auth-pages/forgot-password" className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-zinc-100 font-bold rounded-2xl hover:bg-blue-500 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-10 flex flex-col gap-3 text-center text-zinc-400 font-medium">
            <p>
              New here? <Link href="/auth-pages/register" className="text-zinc-100 font-bold hover:text-blue-400 transition-colors">Create an account</Link>
            </p>
          </div>
        </div>
      </motion.div>

      {/* 2FA Verification Modal */}
      <AnimatePresence>
        {show2FAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !verifying2FA && setShow2FAModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#09090b] border border-zinc-800 rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-2xl mb-4">
                  <Mail className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-2xl font-black text-zinc-100 tracking-tight">Check Your Email</h3>
                <p className="text-sm font-medium text-zinc-400 mt-2 leading-relaxed">
                  We've sent a 6-digit verification code to your email address.
                </p>
              </div>

              <form onSubmit={handleVerify2FA} className="space-y-6">
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-red-300 text-sm font-medium">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.5em] text-3xl font-black py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-zinc-700"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer group p-2 bg-zinc-900/30 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                  <div className="relative flex items-center justify-center shrink-0">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 border-2 border-zinc-700 rounded-lg group-hover:border-blue-500/50 transition-colors peer-checked:border-blue-500 peer-checked:bg-blue-500"></div>
                    <CheckCircle size={14} className="absolute text-white scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                  <div className="flex-1">
                    <span className="block text-sm font-bold text-zinc-300">Remember this device</span>
                    <span className="block text-xs text-zinc-500">Skip 2FA for 7 days on this browser</span>
                  </div>
                </label>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={verifying2FA || twoFaCode.length !== 6}
                    className="w-full py-4 bg-blue-600 text-zinc-100 font-bold rounded-2xl hover:bg-blue-500 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
                  >
                    {verifying2FA ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShow2FAModal(false); setError(''); }}
                    disabled={verifying2FA}
                    className="w-full py-4 bg-transparent text-zinc-400 hover:text-zinc-100 font-bold rounded-2xl transition-all disabled:opacity-50"
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
