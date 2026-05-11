"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getAuthToken, removeAuthToken } from "@/lib/storage";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  MeshDistortMaterial,
  Sphere,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";

function AbstractNetworkShape() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
      <Sphere ref={meshRef} args={[2.2, 48, 48]} position={[0, 0, -1]}>
        <MeshDistortMaterial
          color="#93c5fd"
          emissive="#2563eb"
          emissiveIntensity={2}
          attach="material"
          distort={0.4}
          speed={1.5}
          roughness={0.1}
          metalness={1}
          wireframe={true}
          transparent
          opacity={0.45}
        />
      </Sphere>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={1.5} color="#ffffff" />
      <directionalLight position={[10, 10, 5]} intensity={3} color="#ffffff" />
      <pointLight position={[0, 0, 0]} color="#60a5fa" intensity={15} distance={10} />
      <pointLight position={[-5, -5, -5]} color="#3b82f6" intensity={10} />
      <pointLight position={[5, 5, 5]} color="#8b5cf6" intensity={10} />

      <AbstractNetworkShape />

      <Sparkles count={120} scale={14} size={3} speed={0.4} opacity={0.6} color="#93c5fd" />
      <Sparkles count={60} scale={14} size={2} speed={0.2} opacity={0.4} color="#ffffff" />
    </>
  );
}

function StaticBackground() {
  return (
    <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#09090b] to-[#09090b]" />
  );
}

const navItems =[
  { label: "Features", href: "/features" },
  { label: "About", href: "/about" },
  { label: "Login", href: "/auth-pages/login" },
];

const features =[
  {
    id: "instant-messaging",
    title: "Instant Messaging",
    desc: "Real time, zero lag messaging that keeps your conversations flowing whether you're sending a quick note or a long message, delivery is instant and reliable",
    iconColor: "bg-blue-500",
  },
  {
    id: "rich-media-sharing",
    title: "Rich Media Sharing",
    desc: "Send high-resolution photos, voice memos, video clips, and large files without compression or quality loss your memories stay sharp",
    iconColor: "bg-purple-500",
  },
  {
    id: "end-to-end-security",
    title: "Secure by Default",
    desc: "Every message is encrypted end-to-end before it leaves your device. No ads, no data harvesting your private conversations stay private",
    iconColor: "bg-emerald-500",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const[isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    const mobileListener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", listener);
    mq.addEventListener("change", mobileListener);

    return () => {
      mediaQuery.removeEventListener("change", listener);
      mq.removeEventListener("change", mobileListener);
    };
  },[]);

  useEffect(() => {
    const checkSession = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const response = await apiFetch(`/api/users/current_user`);

        if (response.ok) router.push("/chat");
        else if (response.status === 401 || response.status === 404) removeAuthToken();
      } catch (err) {
        console.error("Session verification failed:", err);
      }
    };
    checkSession();
  },[router]);

  if (!isMounted) return null;

  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 font-sans flex flex-col selection:bg-blue-500/30 overflow-hidden">

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* 3D Canvas — Desktop only, Static Background for mobile or reduced motion */}
      {!prefersReducedMotion && !isMobile ? (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Canvas
            camera={{ position: [0, 0, 6], fov: 45 }}
            dpr={[1, 1.5]}
            gl={{ powerPreference: "high-performance", antialias: true }}
          >
            <Scene />
          </Canvas>
        </div>
      ) : (
        <StaticBackground />
      )}

      <div className="pointer-events-none absolute inset-0 flex justify-center z-0">
        <div className="h-[50rem] w-[100%] max-w-[70rem] bg-blue-500/20 blur-[100px] md:blur-[140px] rounded-full translate-y-[-15%] mix-blend-screen transform-gpu motion-safe:will-change-transform"></div>
      </div>
      
      <nav
        aria-label="Main navigation"
        className="w-full bg-[#09090b]/40 backdrop-blur-lg flex items-center justify-between px-6 py-5 fixed top-0 left-0 right-0 z-50 border-b border-white/10"
      >
        <div className="text-xl font-bold tracking-tighter text-zinc-100 flex items-center gap-2 drop-shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,1)] motion-safe:animate-pulse"></span>
          ChatApp
        </div>

        <ul className="flex items-center gap-6 md:gap-8">
          {navItems.map((item) => {
            // Hide Login on mobile
            if (isMobile && item.label === "Login") return null;

            const isActive = pathname === item.href;
            return (
              <li key={item.href} className="hidden sm:block">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative text-sm font-medium transition-colors duration-300 drop-shadow-sm pb-1
                    ${isActive ? "text-blue-400" : "text-zinc-300 hover:text-white"}
                    after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-blue-400 after:transition-all after:duration-300
                    ${isActive ? "after:w-full" : "after:w-0 hover:after:w-full"}
                  `}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          {/* Hide Sign Up on mobile */}
          {!isMobile && (
            <li>
              <Link
                href="/auth-pages/register"
                className="text-sm font-medium bg-white text-[#09090b] px-5 py-2.5 rounded-full hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] motion-reduce:transition-none motion-reduce:hover:scale-100"
              >
                Sign Up
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <main id="main-content" className="relative z-10 flex-grow flex flex-col items-center justify-center pt-32 pb-16 px-4 sm:px-6 lg:px-8">

        <section
          aria-labelledby="hero-heading"
          className="text-center max-w-4xl mx-auto mb-32 space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-8 duration-1000"
        >
          <h1 id="hero-heading" className="text-5xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 leading-[1.1] drop-shadow-sm">
            Connect in real-time
            <span className="block mt-3 text-2xl md:text-4xl font-normal text-zinc-400 tracking-normal drop-shadow-none bg-none">
              Simple and secure
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed text-balance font-light drop-shadow-md">
            Chat with friends, share moments, and stay connected — no ads, no noise, no compromises. Just clean, fast, encrypted communication built around you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 w-full max-w-md sm:max-w-none mx-auto">
            {isMobile ? (
              <button
                onClick={() => alert("Feature coming")}
                className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-blue-600 rounded-full overflow-hidden transition-all hover:bg-blue-500 hover:scale-[1.03] active:scale-[0.97] shadow-[0_0_40px_0px_rgba(59,130,246,0.6)] hover:shadow-[0_0_60px_5px_rgba(96,165,250,0.8)] border border-blue-400/50 motion-reduce:transition-none motion-reduce:hover:scale-100 w-full sm:w-auto"
              >
                Download
              </button>
            ) : (
              <Link
                href="/auth-pages/register"
                className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-blue-600 rounded-full overflow-hidden transition-all hover:bg-blue-500 hover:scale-[1.03] active:scale-[0.97] shadow-[0_0_40px_0px_rgba(59,130,246,0.6)] hover:shadow-[0_0_60px_5px_rgba(96,165,250,0.8)] border border-blue-400/50 motion-reduce:transition-none motion-reduce:hover:scale-100 w-full sm:w-auto"
              >
                Start Chatting Now
              </Link>
            )}

            <div className="flex w-full sm:w-auto gap-4">
              <Link
                href="/features"
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3.5 text-base font-medium text-zinc-300 bg-white/5 rounded-full overflow-hidden transition-all hover:bg-white/10 hover:text-white border border-white/10 hover:border-white/20 hover:scale-[1.03] active:scale-[0.97]"
              >
                Features
              </Link>
              
              <Link
                href="/about"
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3.5 text-base font-medium text-zinc-300 bg-white/5 rounded-full overflow-hidden transition-all hover:bg-white/10 hover:text-white border border-white/10 hover:border-white/20 hover:scale-[1.03] active:scale-[0.97]"
              >
                About Us
              </Link>
            </div>
          </div>
        </section>

        <ul className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 py-12">
          {features.map((feature, idx) => (
            <li
              key={idx}
              className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:-translate-y-1 hover:border-white/10 motion-reduce:hover:-translate-y-0 text-left"
            >
              <div className={`absolute -top-3 left-6 w-10 h-10 rounded-full ${feature.iconColor}/20 group-hover:${feature.iconColor}/40 transition-colors blur-md`} />

              <h3 className="relative text-xl font-semibold text-white mb-4 tracking-tight group-hover:text-blue-300 transition-colors duration-300 drop-shadow-md z-10">
                {feature.title}
              </h3>

              <p className="relative text-zinc-400 leading-relaxed font-light text-base z-10 group-hover:text-zinc-300 transition-colors">
                {feature.desc}
              </p>

              <Link
                href={`/features#${feature.id}`}
                className="mt-6 font-medium text-sm text-blue-400 opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10 relative flex items-center gap-1 hover:text-blue-300"
                aria-label={`Learn more about ${feature.title}`}
              >
                Learn more <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}