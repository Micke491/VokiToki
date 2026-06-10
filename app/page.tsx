"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { 
  MessageSquare, 
  Video, 
  Image as ImageIcon, 
  Lock, 
  Users, 
  Palette, 
  Rocket, 
  Download, 
  Github, 
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";

const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="shrink-0 w-10 h-10 flex items-center justify-center">
      <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="4" fill="#6366F1"/>
        <path d="M12 10 Q7 16 12 22" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" opacity="0.75"/>
        <path d="M9 7 Q2 16 9 25" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
        <path d="M20 10 Q25 16 20 22" fill="none" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" opacity="0.75"/>
        <path d="M23 7 Q30 16 23 25" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
      </svg>
    </div>
    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight">
      Vokitoki
    </span>
  </div>
);

function useIsMobile() {
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const ua = navigator.userAgent;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      if (w < 768 || (isMobileUA && w < 1024)) {
        setDevice(w < 768 ? "mobile" : "tablet");
      } else {
        setDevice("desktop");
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return device;
}

function ComingSoonModal({ onClose, isDesktop }: { onClose: () => void; isDesktop: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-lg flex items-center justify-center p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#111113] border border-zinc-800 rounded-2xl p-10 text-center max-w-sm w-full shadow-[0_0_80px_-20px_rgba(37,99,235,0.3)] animate-modalPop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-6 text-blue-500">
          <Rocket size={48} />
        </div>
        <h2 className="text-2xl font-extrabold text-zinc-50 mb-3">Coming Soon</h2>
        <p className="text-zinc-500 text-sm leading-relaxed mb-7">
          {isDesktop
            ? "The desktop app is currently in development. Stay tuned!"
            : "The mobile app is currently in development. Stay tuned it's going to be great!"}
        </p>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: <MessageSquare className="text-blue-500" />,
    title: "Real-Time Messaging",
    desc: "Instant delivery via WebSocket channels. No refresh needed, messages appear the moment they're sent.",
  },
  {
    icon: <Video className="text-blue-500" />,
    title: "Voice & Video Calls",
    desc: "Crystal-clear WebRTC-powered calls built with LiveKit. One-on-one or group, your choice.",
  },
  {
    icon: <ImageIcon className="text-blue-500" />,
    title: "Rich Media Sharing",
    desc: "Images, videos, audio, GIFs, stickers and voice messages, all with cloud storage via Cloudinary.",
  },
  {
    icon: <Lock className="text-blue-500" />,
    title: "Security First",
    desc: "JWT sessions, bcrypt hashing, 2FA, email-based password reset and user blocking built in.",
  },
  {
    icon: <Users className="text-blue-500" />,
    title: "Groups & DMs",
    desc: "One-on-one chats and group conversations with pinning, reactions, replies and edit/delete.",
  },
  {
    icon: <Palette className="text-blue-500" />,
    title: "Dark & Light Themes",
    desc: "Premium Zinc/Blue design system with smooth theme switching and system preference detection.",
  },
];

const STATS = [
  { value: "< 100ms", label: "Message Latency" },
  { value: "2FA", label: "Auth Security" },
  { value: "WebRTC", label: "Call Technology" },
  { value: "100%", label: "Open Source" },
];

const TECH = [
  "Next.js 16", "React 19", "TypeScript", "MongoDB", "Pusher",
  "LiveKit", "Cloudinary", "Tailwind CSS 4", "Framer Motion", "Nodemailer",
];

export default function LandingPage() {
  const device = useIsMobile();
  const isMobileOrTablet = device === "mobile" || device === "tablet";
  const [showModal, setShowModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .animate-fadeSlideDown { animation: fadeSlideDown 0.6s ease both; }
        .animate-fadeSlideUp-1 { animation: fadeSlideUp 0.7s 0.15s ease both; }
        .animate-fadeSlideUp-2 { animation: fadeSlideUp 0.7s 0.25s ease both; }
        .animate-fadeSlideUp-3 { animation: fadeSlideUp 0.7s 0.35s ease both; }
        .animate-fadeIn        { animation: fadeIn 0.2s ease; }
        .animate-modalPop      { animation: modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both; }
        .animate-pulse-dot     { animation: pulse 2s infinite; }
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .btn-download-gradient {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
        }
      `}</style>

      <div className="font-sans bg-[#09090b] text-zinc-100 min-h-screen overflow-x-hidden">
        {showModal && (
          <ComingSoonModal onClose={() => setShowModal(false)} isDesktop={!isMobileOrTablet} />
        )}

        {/* NAV */}
        <nav
          className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-8 h-16 transition-all duration-300 ${
            scrolled ? "bg-[#09090b]/85 backdrop-blur-xl border-b border-zinc-800" : ""
          }`}
        >
          <a href="#" className="no-underline">
            <Logo />
          </a>

          <div className="flex items-center gap-3">
            {isMobileOrTablet ? (
              <button
                className="btn-download-gradient text-white px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer flex items-center gap-2 shadow-[0_0_24px_-6px_rgba(124,58,237,0.5)] hover:opacity-90 transition-all hover:-translate-y-px"
                onClick={() => setShowModal(true)}
              >
                <Download size={16} /> Download
              </button>
            ) : (
              <>
                <button
                  className="btn-download-gradient text-white px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer flex items-center gap-2 shadow-[0_0_24px_-6px_rgba(124,58,237,0.5)] hover:opacity-90 transition-all hover:-translate-y-px"
                  onClick={() => setShowModal(true)}
                >
                  <Download size={16} /> Download
                </button>
                <Link
                  href="/auth-pages/login"
                  className="bg-transparent border border-zinc-700 text-zinc-400 px-5 py-2 rounded-lg text-sm font-medium no-underline flex items-center hover:border-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 transition-all"
                >
                  Log in
                </Link>
                <Link
                  href="/auth-pages/register"
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold no-underline flex items-center gap-2 shadow-[0_0_24px_-6px_rgba(37,99,235,0.6)] hover:bg-blue-700 hover:-translate-y-px transition-all"
                >
                  Sign up <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* HERO */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden"
        >
          {/* Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center top, rgba(37,99,235,0.18) 0%, transparent 70%)" }}
          />
          <div className="absolute bottom-0 right-[10%] w-[400px] h-[400px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)" }}
          />

          <div className="animate-fadeSlideDown inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/30 text-blue-300 text-xs font-medium px-4 py-1.5 rounded-full mb-7">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse-dot" />
            Real-time messaging, now live
          </div>

          <h1 className="animate-fadeSlideUp-1 text-[clamp(2.5rem,7vw,5rem)] font-black leading-[1.05] tracking-[-0.03em] mb-5">
            The chat app<br />built for <span className="gradient-text">real people</span>
          </h1>

          <p className="text-center text-zinc-500 max-w-[480px] mx-auto mb-12 leading-relaxed text-sm">
            From instant DMs to group calls, Vokitoki packs a full production-grade feature set into a fast, beautiful interface.
          </p>

          <div className="animate-fadeSlideUp-3 flex flex-wrap gap-3.5 justify-center">
            {isMobileOrTablet ? (
              <>
                <button
                  className="btn-download-gradient text-white px-8 py-3.5 rounded-xl text-base font-bold cursor-pointer flex items-center gap-2 shadow-[0_0_40px_-8px_rgba(124,58,237,0.6)] hover:opacity-90 hover:-translate-y-0.5 transition-all"
                  onClick={() => setShowModal(true)}
                >
                  <Download size={20} /> Download App
                </button>
                <a
                  href="https://github.com/Micke491/chat-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-900 text-zinc-100 border border-zinc-700 px-8 py-3.5 rounded-xl text-base font-semibold no-underline flex items-center gap-2 hover:border-zinc-500 hover:bg-zinc-800 hover:-translate-y-0.5 transition-all"
                >
                  <Github size={20} /> GitHub
                </a>
              </>
            ) : (
              <>
                <Link
                  href="/auth-pages/register"
                  className="bg-blue-600 text-white px-8 py-3.5 rounded-xl text-base font-bold no-underline flex items-center gap-2 shadow-[0_0_40px_-8px_rgba(37,99,235,0.7)] hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
                >
                  Get started free <ArrowRight size={20} />
                </Link>
                <button
                  className="btn-download-gradient text-white px-8 py-3.5 rounded-xl text-base font-bold cursor-pointer flex items-center gap-2 shadow-[0_0_40px_-8px_rgba(124,58,237,0.6)] hover:opacity-90 hover:-translate-y-0.5 transition-all"
                  onClick={() => setShowModal(true)}
                >
                  <Download size={20} /> Download App
                </button>
                <a
                  href="https://github.com/Micke491/chat-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-900 text-zinc-100 border border-zinc-700 px-8 py-3.5 rounded-xl text-base font-semibold no-underline flex items-center gap-2 hover:border-zinc-500 hover:bg-zinc-800 hover:-translate-y-0.5 transition-all"
                >
                  <Github size={20} /> View on GitHub
                </a>
              </>
            )}
          </div>
        </section>

        {/* STATS */}
        <div className="flex flex-wrap justify-center gap-8 px-6 py-12 border-t border-b border-zinc-900 bg-[#0d0d10]">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-extrabold text-zinc-50">{s.value}</div>
              <div className="text-xs text-zinc-500 mt-1 font-medium uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

        {/* FEATURES */}
        <div className="px-6 py-20 max-w-[1100px] mx-auto">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest text-center mb-3">Features</p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold text-center leading-tight mb-3">
            Everything you need to connect
          </h2>
          <p className="text-center text-zinc-500 max-w-[480px] mx-auto mb-12 leading-relaxed text-sm">
            From instant DMs to group calls, VokiToki packs a full production-grade feature set into a fast, beautiful interface.
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-[#111113] border border-zinc-800/60 rounded-2xl p-7 relative overflow-hidden transition-all duration-300 hover:border-blue-600/30 hover:-translate-y-1 hover:shadow-[0_8px_32px_-8px_rgba(37,99,235,0.15)] group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="text-blue-500 mb-4 block">
                  {typeof f.icon === 'string' ? f.icon : f.icon}
                </div>
                <div className="text-base font-bold text-zinc-50 mb-2">{f.title}</div>
                <div className="text-sm text-zinc-500 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TECH STACK */}
        <div className="px-6 py-16 border-t border-zinc-900">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest text-center mb-3">Tech Stack</p>
          <h2 className="text-2xl font-extrabold text-center mb-0">Built with modern tools</h2>
          <div className="flex flex-wrap gap-3 justify-center max-w-[700px] mx-auto mt-8">
            {TECH.map((t) => (
              <span
                key={t}
                className="bg-[#111113] border border-zinc-800 text-zinc-400 text-xs font-medium px-3.5 py-1.5 rounded-full transition-all hover:border-blue-500 hover:text-blue-300 hover:bg-blue-600/10"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className="px-6 py-20 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(180deg, #09090b 0%, #0d1220 50%, #09090b 100%)" }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)" }}
          />
          <h2 className="relative text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold mb-4">
            Ready to start chatting?
          </h2>
          <p className="relative text-zinc-500 max-w-[480px] mx-auto mb-10 leading-relaxed">
            Join the platform built for speed, privacy, and great design. No credit card required.
          </p>
          <div className="relative flex flex-wrap gap-4 justify-center">
            {isMobileOrTablet ? (
              <button
                className="btn-download-gradient text-white px-8 py-3.5 rounded-xl text-base font-bold cursor-pointer flex items-center gap-2 shadow-[0_0_40px_-8px_rgba(124,58,237,0.6)] hover:opacity-90 hover:-translate-y-0.5 transition-all"
                onClick={() => setShowModal(true)}
              >
                <Download size={20} /> Download App
              </button>
            ) : (
              <>
                <Link
                  href="/auth-pages/register"
                  className="bg-blue-600 text-white px-8 py-3.5 rounded-xl text-base font-bold no-underline flex items-center gap-2 shadow-[0_0_40px_-8px_rgba(37,99,235,0.7)] hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
                >
                  Create free account <ArrowRight size={20} />
                </Link>
                <button
                  className="btn-download-gradient text-white px-8 py-3.5 rounded-xl text-base font-bold cursor-pointer flex items-center gap-2 shadow-[0_0_40px_-8px_rgba(124,58,237,0.6)] hover:opacity-90 hover:-translate-y-0.5 transition-all"
                  onClick={() => setShowModal(true)}
                >
                  <Download size={20} /> Download App
                </button>
                <Link
                  href="/auth-pages/login"
                  className="bg-zinc-900 text-zinc-100 border border-zinc-700 px-8 py-3.5 rounded-xl text-base font-semibold no-underline flex items-center gap-2 hover:border-zinc-500 hover:bg-zinc-800 hover:-translate-y-0.5 transition-all"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>

        <footer>
          <div className="px-6 pt-16 pb-8 border-t border-zinc-900 max-w-[1100px] mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
              <Logo />
              <div className="flex flex-wrap gap-x-10 gap-y-4 max-sm:justify-center">
                <a
                  href="https://github.com/Micke491/chat-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 no-underline hover:text-zinc-100 transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://chat-app-gules-six-81.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 no-underline hover:text-zinc-100 transition-colors"
                >
                  Live Demo
                </a>
                {!isMobileOrTablet && (
                  <>
                    <Link href="/auth-pages/login" className="text-sm text-zinc-500 no-underline hover:text-zinc-100 transition-colors">Login</Link>
                    <Link href="/auth-pages/register" className="text-sm text-zinc-500 no-underline hover:text-zinc-100 transition-colors">Sign up</Link>
                  </>
                )}
              </div>
            </div>
            <div className="pt-8 border-t border-zinc-800/50 flex flex-wrap items-center justify-between gap-4 max-sm:justify-center max-sm:text-center">
              <span className="text-xs text-zinc-600">© 2026 Vokitoki · Built with Next.js & MongoDB</span>
              <span className="text-xs text-zinc-600 italic">MIT License</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}