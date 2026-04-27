'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, MessageSquare, BookImage, LogOut, Shield, ChevronRight, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthToken, removeAuthToken } from '@/lib/storage';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/stories', label: 'Stories', icon: BookImage },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const token = getAuthToken();
        if (!token) { router.replace('/'); return; }

        const res = await fetch('/api/admin/users?limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) { router.replace('/'); return; }
        setChecking(false);
      } catch {
        router.replace('/');
      }
    }
    checkAdmin();
  }, [router]);

  useEffect(() => {
    // Close mobile menu on route change
    setMobileMenuOpen(false);
  }, [pathname]);

  function handleLogout() {
    removeAuthToken();
    router.push('/');
  }

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-chat-bg-primary gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-chat-border border-t-chat-accent animate-spin" />
        <p className="text-sm text-chat-text-tertiary">Verifying access...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-chat-bg-primary font-sans">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-5 py-4 bg-chat-bg-secondary border-b border-chat-border sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chat-accent to-chat-accent-hover flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            <Shield size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-chat-text-primary">Admin Panel</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-chat-text-secondary hover:text-chat-text-primary transition-colors"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed inset-x-0 top-[65px] bottom-0 bg-chat-bg-primary z-40 border-t border-chat-border overflow-y-auto"
          >
            <nav className="p-4 flex flex-col gap-1">
              {navItems.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      active 
                        ? 'bg-chat-bg-secondary text-chat-text-primary shadow-sm' 
                        : 'text-chat-text-secondary hover:bg-chat-bg-secondary/50'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-chat-accent' : ''} />
                    <span className="flex-1 text-sm font-medium">{label}</span>
                    {active && <ChevronRight size={14} className="text-chat-accent" />}
                  </Link>
                );
              })}
              <div className="mt-4 pt-4 border-t border-chat-border">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-chat-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-all duration-200"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-medium">Back to App</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-chat-bg-secondary border-r border-chat-border sticky top-0 h-screen">
        {/* Logo Section */}
        <div className="p-6 border-b border-chat-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-chat-accent to-chat-accent-hover flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-chat-text-primary leading-tight">Admin Panel</p>
              <p className="text-[11px] text-chat-text-tertiary leading-tight mt-0.5">ChatApp Control</p>
            </div>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                  active 
                    ? 'bg-chat-bg-primary text-chat-text-primary shadow-sm border border-chat-border/50' 
                    : 'text-chat-text-secondary hover:text-chat-text-primary hover:bg-chat-bg-primary/30'
                }`}
              >
                <Icon size={16} className={`shrink-0 transition-colors ${active ? 'text-chat-accent' : 'group-hover:text-chat-text-primary'}`} />
                <span className={`flex-1 text-[13px] ${active ? 'font-medium' : 'font-normal'}`}>{label}</span>
                {active && (
                  <motion.div layoutId="activeNav" className="w-1.5 h-1.5 rounded-full bg-chat-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-chat-border bg-chat-bg-secondary/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-chat-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 group"
          >
            <LogOut size={16} className="transition-transform group-hover:-translate-x-0.5" />
            <span className="text-[13px] font-medium text-left">Back to App</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}

