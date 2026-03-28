"use client";

import { MessageCircle, Download, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ChatIntro() {
  return (
    <div className="min-h-screen bg-[#0f172a] selection:bg-purple-500/30 overflow-x-hidden">
      {/* Dynamic Background - Slightly reduced opacity for mobile performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[5%] -left-[10%] w-[70%] sm:w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[80px] sm:blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] sm:w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[80px] sm:blur-[100px] animate-pulse delay-700" />
        <div className="absolute -bottom-[10%] left-[10%] w-[60%] sm:w-[35%] h-[35%] bg-blue-600/10 rounded-full blur-[80px] sm:blur-[110px] animate-pulse delay-1000" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-gradient-to-tr from-purple-600 to-indigo-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-lg shadow-purple-500/20">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-white tracking-tight">ChatFlow</span>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/auth-pages/login" className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Login
            </Link>
            <Link href="/auth-pages/register">
              <button className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white text-slate-950 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10">
                Join <span className="hidden xs:inline">Now</span>
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-28 pb-12 px-6 sm:pt-32 sm:pb-20">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-6 sm:mb-8">
              <Zap className="w-3 h-3 fill-current" /> Next Generation Messaging
            </span>
            
            <h1 className="text-4xl xs:text-5xl sm:text-7xl md:text-8xl font-black text-white mb-6 sm:mb-8 tracking-tighter leading-[1.1] sm:leading-[0.9]">
              Connect without <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-indigo-400 bg-clip-text text-transparent">
                Boundaries.
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
              The ultimate workspace for your conversations. Secure, lightning-fast, and designed for the modern era.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4 sm:px-0">
              <Link href="/auth-pages/register" className="w-full sm:w-auto">
                <button className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl sm:rounded-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25">
                  Start Chatting Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <button 
                onClick={() => alert("Desktop App Coming Soon")} 
                className="w-full sm:w-auto px-8 py-4 bg-white/5 backdrop-blur-md text-white font-bold rounded-xl sm:rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5 text-slate-400" />
                Desktop App
              </button>
            </div>
          </motion.div>

          {/* Floating UI Preview placeholder */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-16 sm:mt-20 relative mx-auto max-w-4xl px-2 sm:px-0"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent z-10" />
            <div className="bg-slate-900 rounded-2xl sm:rounded-3xl border border-white/10 p-2 sm:p-4 shadow-2xl">
                <div className="aspect-video sm:aspect-[16/9] bg-slate-950 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-800 text-xs sm:text-base font-bold border border-white/5">
                   APP INTERFACE PREVIEW
                </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}