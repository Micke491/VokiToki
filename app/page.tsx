"use client";

import { useEffect, useState, useRef, ReactNode, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Video,
  Image as ImageIcon,
  Lock,
  Users,
  Palette,
  Download,
  Github,
  ArrowRight,
  Zap,
  Globe,
  Shield,
  Activity,
  CheckCircle2,
  Server,
  Smartphone,
} from "lucide-react";

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const val = Math.min(window.scrollY / 800, 1);
          setProgress(val);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return progress;
}

function ScrollProgressBar() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      if (ref.current) {
        const winScroll =
          document.body.scrollTop || document.documentElement.scrollTop;
        const height =
          document.documentElement.scrollHeight -
          document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        ref.current.style.width = scrolled + "%";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-500 z-[200] transition-all duration-75"
      ref={ref}
      style={{ width: "0%" }}
    />
  );
}

function Parallax({
  children,
  speed = 0.5,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (window.innerWidth < 768) return;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (ref.current) {
            const yPos = window.scrollY * speed;
            ref.current.style.transform = `translate3d(0, ${yPos}px, 0)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);

  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}

function ScrollReveal({
  children,
  className = "",
  delay = 0,
  threshold = 0.1,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function TiltCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    transform:
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
  });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768 || !ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    const rotateX = (0.5 - y) * 10;
    const rotateY = (x - 0.5) * 10;
    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: "none",
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform:
        "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.5s ease-out",
    });
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, transformStyle: "preserve-3d" }}
      className={`will-change-transform ${className}`}
    >
      <div style={{ transform: "translateZ(20px)" }} className="h-full">
        {children}
      </div>
    </div>
  );
}

const Logo = () => (
  <div className="flex items-center gap-3 group cursor-pointer">
    <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center transition-transform duration-500 group-hover:rotate-[180deg]">
      <svg width="100%" height="100%" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="4" fill="#2563eb" />
        <path
          d="M12 10 Q7 16 12 22"
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M9 7 Q2 16 9 25"
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M20 10 Q25 16 20 22"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M23 7 Q30 16 23 25"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </div>
    <span className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight">
      Vokitoki
    </span>
  </div>
);

function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#111113] border border-zinc-800 rounded-3xl p-6 md:p-8 text-center max-w-sm w-full shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-6 text-blue-500 relative">
          <Server size={48} className="relative z-10" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-50 mb-3 tracking-tight">
          Deployment Pending
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          The standalone desktop and mobile applications are currently
          undergoing testing. Please use the web platform in the meantime.
        </p>
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer"
          onClick={onClose}
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}

function MobileAppModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#111113] border border-zinc-800 rounded-3xl p-6 md:p-8 text-center max-w-sm w-full shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-6 text-blue-500 relative">
          <Smartphone size={48} className="relative z-10 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-50 mb-3 tracking-tight">
          Use Mobile App
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          The web platform registration is optimized exclusively for desktop/PC
          environments. To connect via mobile or tablet devices, please use our
          mobile app.
        </p>
        <div className="flex flex-col gap-3">
          <div className="bg-zinc-900 border border-zinc-800 text-zinc-400 py-3 rounded-xl text-xs font-mono font-medium">
            Mobile Releases Under Testing
          </div>
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer"
            onClick={onClose}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: <MessageSquare className="text-blue-400" size={24} />,
    title: "Real-Time Protocol",
    desc: "Built on optimized WebSocket channels ensuring messages are delivered and synchronized instantaneously across all devices.",
  },
  {
    icon: <Video className="text-blue-400" size={24} />,
    title: "High-Fidelity Calling",
    desc: "Enterprise-grade WebRTC infrastructure for uninterrupted, crystal-clear voice and high-definition video conferences.",
  },
  {
    icon: <ImageIcon className="text-blue-400" size={24} />,
    title: "Media Management",
    desc: "Secure cloud infrastructure for sharing documents, images, and videos with automatic format optimization and compression.",
  },
  {
    icon: <Lock className="text-blue-400" size={24} />,
    title: "Advanced Security",
    desc: "Rigorous security standards including strict JWT sessions, automated threat blocking, and optional Two-Factor Authentication.",
  },
  {
    icon: <Users className="text-blue-400" size={24} />,
    title: "Scalable Workspaces",
    desc: "Support for direct messaging and large-scale group environments, complete with administrative controls and pinning features.",
  },
  {
    icon: <Palette className="text-blue-400" size={24} />,
    title: "Adaptive Interface",
    desc: "A precision-engineered user interface offering seamless transitions between intelligent light and dark modes.",
  },
];

const STATS = [
  { value: "<50ms", label: "Delivery Latency" },
  { value: "AES-256", label: "Encryption Standard" },
  { value: "WebRTC", label: "Call Architecture" },
  { value: "99.9%", label: "Platform Uptime" },
];

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const scrollProgress = useScrollProgress();
  const heroRotateX = Math.max(0, 20 - scrollProgress * 30);
  const heroScale = Math.min(1, 0.9 + scrollProgress * 0.1);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeSlideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
        
        .animate-fadeSlideDown { animation: fadeSlideDown 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .animate-fadeSlideUp-1 { animation: fadeSlideUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
        .animate-fadeSlideUp-2 { animation: fadeSlideUp 0.8s 0.2s cubic-bezier(0.16,1,0.3,1) both; }
        .animate-fadeSlideUp-3 { animation: fadeSlideUp 0.8s 0.3s cubic-bezier(0.16,1,0.3,1) both; }
        .animate-fadeIn        { animation: fadeIn 0.3s ease; }
        .animate-marquee       { animation: marquee 40s linear infinite; }
        
        .bg-grid-pattern {
          background-size: 50px 50px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
        }
        
        .glass-panel {
          background: rgba(15, 15, 17, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
      `}</style>

      <ScrollProgressBar />

      <div className="font-sans bg-[#050505] text-zinc-100 min-h-screen overflow-hidden relative selection:bg-blue-500/30 selection:text-blue-200">
        {/* Background Grid & Glows */}
        <div className="fixed inset-0 bg-grid-pattern pointer-events-none z-0" />
        <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none z-0" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none z-0" />

        {/* Parallax Background Icons (Hidden on Mobile) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden md:block">
          <Parallax
            speed={0.15}
            className="absolute top-[15%] left-[10%] opacity-[0.03]"
          >
            <MessageSquare size={120} />
          </Parallax>
          <Parallax
            speed={0.25}
            className="absolute top-[40%] right-[12%] opacity-[0.03]"
          >
            <Lock size={140} />
          </Parallax>
          <Parallax
            speed={0.1}
            className="absolute top-[75%] left-[15%] opacity-[0.03]"
          >
            <Globe size={100} />
          </Parallax>
        </div>

        {showModal && <ComingSoonModal onClose={() => setShowModal(false)} />}
        {showMobileModal && (
          <MobileAppModal onClose={() => setShowMobileModal(false)} />
        )}

        {/* Navigation */}
        <nav
          className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-10 h-16 md:h-20 transition-all duration-300 ${
            scrolled
              ? "bg-[#050505]/80 backdrop-blur-xl border-b border-white/5"
              : "bg-transparent"
          }`}
        >
          <a href="#" className="no-underline">
            <Logo />
          </a>

          {/* Desktop Nav (Only visible on screens 1024px and wider) */}
          <div className="hidden lg:flex items-center gap-6">
            <Link
              href="/auth-pages/login"
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Sign In
            </Link>
            <button
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
              onClick={() => setShowModal(true)}
            >
              <Download size={16} /> Desktop App
            </button>
            <Link
              href="/auth-pages/register"
              className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors"
            >
              Get Started <ArrowRight size={16} />
            </Link>
          </div>

          {/* Mobile/Tablet Nav (Visible on screens smaller than 1024px; removes web registration/login links) */}
          <div className="flex lg:hidden items-center gap-3">
            <button
              onClick={() => setShowMobileModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Smartphone size={16} /> Get App
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-16 md:pt-48 md:pb-24 px-4 md:px-6 flex flex-col items-center text-center z-10 min-h-[90vh] md:min-h-0">
          <div className="animate-fadeSlideDown inline-flex items-center gap-2 glass-panel text-zinc-300 text-xs md:text-sm font-medium px-4 py-2 rounded-full mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            VokiToki Systems Operational
          </div>

          <h1 className="animate-fadeSlideUp-1 text-4xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight mb-6 text-white max-w-4xl">
            Unify Your <br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Communication
            </span>
          </h1>

          <p className="animate-fadeSlideUp-2 text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed text-base md:text-lg px-4 md:px-0">
            Experience real-time messaging, crystal-clear voice integration, and
            high-definition video conferencing in a single, secure platform
            designed for modern teams and communities.
          </p>

          {/* Desktop CTAs (Only visible on screens 1024px and wider) */}
          <div className="hidden lg:flex animate-fadeSlideUp-3 flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto px-4 sm:px-0">
            <Link
              href="/auth-pages/register"
              className="bg-white text-black px-8 py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors shadow-lg"
            >
              Launch Platform <ArrowRight size={18} />
            </Link>
            <a
              href="https://github.com/Micke491/chat-app"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-panel text-white px-8 py-4 rounded-xl text-base font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
            >
              <Github size={18} /> Source Repository
            </a>
          </div>

          {/* Mobile/Tablet CTAs (Visible on screens smaller than 1024px; replaced platform links with mobile app prompt) */}
          <div className="flex lg:hidden animate-fadeSlideUp-3 flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto px-4 sm:px-0">
            <button
              onClick={() => setShowMobileModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
            >
              <Smartphone size={18} /> Download Mobile App{" "}
              <ArrowRight size={18} />
            </button>
            <a
              href="https://github.com/Micke491/chat-app"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-panel text-white px-8 py-4 rounded-xl text-base font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
            >
              <Github size={18} /> Source Repository
            </a>
          </div>

          {/* 3D Dashboard Mockup */}
          <div className="w-full max-w-5xl mx-auto mt-16 md:mt-24 px-2 md:px-0 perspective-1000">
            <div
              style={{
                transform: `rotateX(${heroRotateX}deg) scale(${heroScale})`,
                transition: "transform 0.1s ease-out",
              }}
              className="will-change-transform rounded-2xl md:rounded-3xl border border-white/10 bg-[#0a0a0c]/90 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col h-[400px] md:h-[600px] mx-auto w-full"
            >
              {/* Mockup Header */}
              <div className="h-10 md:h-12 border-b border-white/10 flex items-center px-4 bg-white/[0.02]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                </div>
                <div className="mx-auto bg-white/5 px-4 py-1 rounded text-[10px] md:text-xs text-zinc-500 font-mono tracking-widest">
                  vokitoki-environment
                </div>
              </div>

              {/* Mockup Body */}
              <div className="flex-1 flex p-4 md:p-6 gap-6 relative">
                <div className="hidden md:flex w-64 flex-col gap-4 border-r border-white/5 pr-6">
                  <div className="h-8 bg-white/5 rounded-md w-full" />
                  <div className="flex flex-col gap-4 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-2.5 bg-white/10 rounded w-2/3" />
                          <div className="h-2 bg-white/5 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-end gap-4 relative pb-2">
                  <div className="self-start max-w-[85%] md:max-w-[70%] bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-3 md:p-4 text-sm text-zinc-300">
                    The deployment was successful. Let's sync on the new
                    architecture.
                  </div>
                  <div className="self-end max-w-[85%] md:max-w-[70%] bg-blue-600 text-white rounded-2xl rounded-tr-sm p-3 md:p-4 text-sm">
                    Reviewing the logs now. Everything looks stable across all
                    nodes.
                  </div>
                  <div className="self-start max-w-[85%] md:max-w-[70%] bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-3 md:p-4 text-sm text-zinc-300">
                    Excellent. Initiating the secure video bridge for the
                    review.
                  </div>

                  <div className="mt-2 h-12 md:h-14 bg-white/5 border border-white/10 rounded-xl w-full flex items-center px-4">
                    <div className="h-3 bg-white/20 rounded w-32" />
                  </div>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a0a0c] to-transparent pointer-events-none" />
            </div>
          </div>
        </section>

        {/* Marquee Banner */}
        <div className="relative z-20 py-4 bg-zinc-900 border-y border-zinc-800 overflow-hidden flex items-center">
          <div className="flex w-max animate-marquee items-center">
            {[...Array(4)].map((_, idx) => (
              <div
                key={idx}
                className="flex gap-8 md:gap-16 items-center px-8 text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap"
              >
                <span className="flex items-center gap-2">
                  <Zap size={16} /> Zero Latency
                </span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <Lock size={16} /> Encrypted Data
                </span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <Activity size={16} /> WebRTC Ready
                </span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <Shield size={16} /> 2FA Security
                </span>
                <span>•</span>
              </div>
            ))}
          </div>
        </div>

        {/* Core Metrics */}
        <section className="relative z-10 py-20 md:py-28 bg-[#050505]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 text-center">
              {STATS.map((s, idx) => (
                <ScrollReveal
                  key={s.label}
                  delay={idx * 100}
                  className="relative"
                >
                  <div className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                    {s.value}
                  </div>
                  <div className="text-xs md:text-sm text-zinc-500 font-bold uppercase tracking-widest">
                    {s.label}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="px-4 md:px-8 py-20 md:py-32 max-w-7xl mx-auto relative z-10 border-t border-white/5">
          <ScrollReveal className="text-center mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl font-black leading-tight mb-4 text-white tracking-tight">
              Engineered for Performance
            </h2>
            <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto">
              A robust feature set built to facilitate reliable and secure
              communication.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {FEATURES.map((f, idx) => (
              <ScrollReveal key={f.title} delay={idx * 100}>
                <TiltCard className="h-full">
                  <div className="h-full glass-panel rounded-2xl p-8 relative transition-colors duration-300 hover:bg-white/[0.05] group">
                    <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 group-hover:bg-blue-600/10 transition-colors">
                      {f.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3 tracking-tight">
                      {f.title}
                    </h3>
                    <p className="text-zinc-400 leading-relaxed text-sm">
                      {f.desc}
                    </p>
                  </div>
                </TiltCard>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Process Section */}
        <section className="px-4 md:px-8 py-20 md:py-28 relative z-10 bg-zinc-950/50 border-y border-white/5">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal className="mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                Implementation Workflow
              </h2>
              <p className="text-zinc-400 text-base">
                Initialize your workspace in three streamlined steps.
              </p>
            </ScrollReveal>

            <div className="relative border-l border-zinc-800 ml-4 md:ml-6 space-y-12 pb-4">
              {[
                {
                  title: "Secure Account Setup",
                  desc: "Create your workspace parameters in seconds and establish protective configurations.",
                },
                {
                  title: "Establish Connections",
                  desc: "Locate peers securely through our optimized directory and construct your secure contact network.",
                },
                {
                  title: "Initiate Communication",
                  desc: "Deploy real-time messaging, share critical files, or launch encrypted WebRTC calls seamlessly.",
                },
              ].map((step, idx) => (
                <ScrollReveal
                  key={idx}
                  delay={150}
                  className="relative pl-8 md:pl-10"
                >
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-[#050505]" />
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-zinc-400 leading-relaxed text-sm md:text-base max-w-xl">
                    {step.desc}
                  </p>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 md:px-8 py-24 md:py-32 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none z-0" />

          <div className="relative max-w-3xl mx-auto z-10 glass-panel border border-white/10 rounded-[2rem] p-8 md:p-16 shadow-2xl">
            <ScrollReveal>
              <h2 className="text-3xl md:text-5xl font-black mb-6 text-white tracking-tight">
                Establish Your Secure Node
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto mb-10 text-base md:text-lg">
                Access the communication platform engineered for reliability and
                privacy. No complex configuration required.
              </p>
            </ScrollReveal>

            {/* Desktop final CTA (Only visible on screens 1024px and wider) */}
            <ScrollReveal
              delay={150}
              className="hidden lg:flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center w-full"
            >
              <Link
                href="/auth-pages/register"
                className="bg-blue-600 text-white px-8 py-4 rounded-xl text-sm md:text-base font-bold shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Access Platform <ArrowRight size={18} />
              </Link>
              <button
                className="glass-panel text-white px-8 py-4 rounded-xl text-sm md:text-base font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                onClick={() => setShowModal(true)}
              >
                <Download size={18} /> Download Client
              </button>
            </ScrollReveal>

            {/* Mobile/Tablet final CTA (Visible on screens smaller than 1024px) */}
            <ScrollReveal
              delay={150}
              className="flex lg:hidden flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center w-full"
            >
              <button
                onClick={() => setShowMobileModal(true)}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl text-sm md:text-base font-bold shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer w-full"
              >
                <Smartphone size={18} /> Download Mobile App{" "}
                <ArrowRight size={18} />
              </button>
            </ScrollReveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-zinc-900 bg-[#050505]">
          <div className="px-6 md:px-10 py-12 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
              <Logo />

              {/* Desktop Footer Options */}
              <div className="hidden lg:flex flex-wrap gap-6 justify-center">
                <Link
                  href="/help"
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Help
                </Link>
                <Link
                  href="/terms"
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy"
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Privacy
                </Link>
                <a
                  href="https://github.com/Micke491/chat-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Repository
                </a>
                <Link
                  href="/auth-pages/login"
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Login
                </Link>
              </div>

              {/* Mobile/Tablet Footer Options */}
              <div className="flex lg:hidden flex-wrap gap-6 justify-center">
                <Link
                  href="/help"
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Help
                </Link>
                <Link
                  href="/terms"
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy"
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Privacy
                </Link>
                <button
                  onClick={() => setShowMobileModal(true)}
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Get App
                </button>
              </div>
            </div>
            <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <span className="text-xs text-zinc-600 font-medium">
                © 2026 VokiToki. All systems operational.
              </span>
              <span className="text-xs text-zinc-600 font-medium">
                MIT Licensed
              </span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
