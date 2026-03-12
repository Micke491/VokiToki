"use client";

import { MessageCircle, Download, LogIn, UserPlus, Zap, Shield, Users } from 'lucide-react';
import Link from 'next/link';

export default function ChatIntro() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-20 px-4 py-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2 text-white">
            <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-xl sm:text-2xl font-bold">ChatFlow</span>
          </div>
          <div className="flex gap-1 sm:gap-3">
            <Link href="/auth-pages/login">
              <button className="px-3 sm:px-5 py-2 text-white font-medium hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-xs sm:text-base">
                Login
              </button>
            </Link>
            <Link href="/auth-pages/register">
              <button className="px-3 sm:px-5 py-2 bg-white text-purple-600 font-medium rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-xs sm:text-base whitespace-nowrap">
                Sign Up
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center px-6">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-700"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">

          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-white mb-6 leading-tight px-4 mt-20 sm:mt-0">
            Connect With
            <span className="block bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
              Anyone, Anywhere
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-purple-100 mb-12 max-w-2xl mx-auto px-6">
            Experience seamless conversations with end-to-end encryption, lightning-fast messaging, and a beautiful interface that works everywhere.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 px-6 w-full max-w-md mx-auto sm:max-w-none">
            <button onClick={() => alert("Feature not available yet")} className="group w-full sm:w-auto px-8 py-4 bg-white text-purple-600 font-semibold rounded-xl hover:bg-gray-50 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-2xl cursor-pointer">
              <Download className="w-5 h-5 group-hover:animate-bounce" />
              Download Now
            </button>
            <Link href="/auth-pages/login" className="w-full sm:w-auto">
              <button className="relative w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-md text-white font-semibold rounded-xl hover:bg-white/20 transition-all transform hover:scale-105 border-2 border-white/30 hover:border-white/50 flex items-center justify-center gap-2 shadow-lg overflow-hidden group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <LogIn className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform" />
                <span className="relative z-10">Login</span>
              </button>
            </Link>
            <Link href="/auth-pages/register" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-xl cursor-pointer">
                <UserPlus className="w-5 h-5" />
                Register Free
              </button>
            </Link>
          </div>

          </div>
        </div>
      </div>
    );
}