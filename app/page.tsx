"use client";

import { MessageCircle, Download, LogIn, UserPlus, Zap, Shield, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ChatIntro() {
  return (
    <div className="min-h-screen bg-[#0f172a] selection:bg-purple-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse delay-700" />
        <div className="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] bg-blue-600/20 rounded-full blur-[110px] animate-pulse delay-1000" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-gradient-to-tr from-purple-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-purple-500/20">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">ChatFlow</span>
          </div>
          
          <div className="flex items-center gap-6">
            <Link href="/auth-pages/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Login
            </Link>
            <Link href="/auth-pages/register">
              <button className="px-5 py-2.5 bg-white text-slate-950 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10">
                Join Now
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-8">
              <Zap className="w-3 h-3 fill-current" /> Next Generation Messaging
            </span>
            
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
              Connect without <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-indigo-400 bg-clip-text text-transparent">
                Boundaries.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              The ultimate workspace for your conversations. Secure, lightning-fast, and designed for the modern era of communication.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth-pages/register" className="w-full sm:w-auto">
                <button className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl hover:opacity-90 transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25">
                  Start Chatting Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <button onClick={() => alert("Desktop App Coming Soon")} className="w-full sm:w-auto px-8 py-4 bg-white/5 backdrop-blur-md text-white font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <Download className="w-5 h-5 text-slate-400" />
                Get Desktop App
              </button>
            </div>
          </motion.div>

          {/* Floating UI Preview placeholder */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-20 relative mx-auto max-w-4xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent z-10" />
            <div className="bg-slate-900 rounded-3xl border border-white/10 p-4 shadow-2xl">
                <div className="aspect-[16/9] bg-slate-950 rounded-2xl flex items-center justify-center text-slate-800 font-bold border border-white/5">
                   {/* You could put a screenshot of your app here */}
                   APP INTERFACE PREVIEW
                </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}