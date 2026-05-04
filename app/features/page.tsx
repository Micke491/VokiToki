"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles, Float, Sphere, MeshDistortMaterial } from "@react-three/drei";
import { motion } from "framer-motion";
import {
  Zap,
  ShieldCheck,
  Share2,
  Cpu,
  Globe,
  Smartphone,
  CheckCircle2
} from "lucide-react";

// Desktop 3D scene
function Scene() {
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 5]} intensity={3} />
      <pointLight position={[0, 0, 0]} color="#60a5fa" intensity={15} distance={10} />
      <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
        <Sphere args={[2.2, 48, 48]} position={[0, 0, -1]}>
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
            opacity={0.3}
          />
        </Sphere>
      </Float>
      <Sparkles count={100} scale={14} size={3} speed={0.4} opacity={0.4} color="#93c5fd" />
    </>
  );
}

// Lightweight mobile 3D scene
function SceneMobile() {
  return (
    <>
      <ambientLight intensity={1.2} />
      <pointLight position={[0, 0, 0]} color="#60a5fa" intensity={8} distance={6} />
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={1}>
        <Sphere args={[1.1, 28, 28]} position={[0, 0, 0]}>
          <MeshDistortMaterial
            color="#93c5fd"
            emissive="#2563eb"
            emissiveIntensity={1.5}
            attach="material"
            distort={0.35}
            speed={1}
            roughness={0.1}
            metalness={1}
            wireframe={true}
            transparent
            opacity={0.35}
          />
        </Sphere>
      </Float>
      <Sparkles count={40} scale={7} size={2} speed={0.3} opacity={0.35} color="#93c5fd" />
    </>
  );
}

const detailedFeatures = [
  {
    id: "instant-messaging",
    title: "Instant Messaging",
    description: "Communication should never wait. Our distributed real time infrastructure delivers your messages in milliseconds whether across the street or across the world. Typing indicators, read receipts, and delivery confirmations keep every conversation transparent and alive",
    icon: Zap,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    points: ["Real-time delivery status", "Typing indicators", "Message reactions & replies"]
  },
  {
    id: "end-to-end-security",
    title: "End-to-End Security",
    description: "Your privacy is not a feature, it's the foundation. Every single message, file, and call is encrypted on your device using AES-256 before transmission. We have zero access to your conversations. No surveillance, no data profiling, no compromise",
    icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    points: ["AES-256 end-to-end encryption", "Self-destructing messages", "Zero data harvesting or ads"]
  },
  {
    id: "rich-media-sharing",
    title: "Rich Media Sharing",
    description: "Send the world in full resolution. Share photos, videos, voice memos, and files of any size without compression or quality loss. Your memories and documents deserve to be experienced exactly as you captured them not downgraded by a server",
    icon: Share2,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    points: ["Uncompressed photo & video", "Voice memos with waveform playback", "Large file transfers (up to 2 GB)"]
  },
  {
    id: "cross-platform-sync",
    title: "Cross-Platform Sync",
    description: "Start a conversation on your phone, continue it on your laptop, and finish on your tablet seamlessly. ChatApp syncs your full message history, media, and settings across every device in real time, even when you're offline",
    icon: Smartphone,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    points: ["Instant cloud sync across devices", "Multi-device simultaneous login", "Full offline access & drafts"]
  }
];

export default function FeaturesPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-blue-500/30 overflow-x-hidden">

      {/* --- Persistent Background --- */}
      {isMobile ? (
        <div
          className="fixed top-8 right-[-1.5rem] z-0 pointer-events-none"
          style={{ width: "180px", height: "180px", opacity: 0.45 }}
        >
          <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }} dpr={[1, 1]} gl={{ powerPreference: "low-power", antialias: false }}>
            <SceneMobile />
          </Canvas>
        </div>
      ) : (
        <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
          <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 1.5]} gl={{ powerPreference: "high-performance", antialias: true }}>
            <Scene />
          </Canvas>
        </div>
      )}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.05),transparent)] z-0 pointer-events-none" />

      {/* --- Navigation --- */}
      <nav className="w-full bg-[#09090b]/40 backdrop-blur-lg flex items-center justify-between px-6 py-5 fixed top-0 z-50 border-b border-white/10">
        <Link href="/" className="text-xl font-bold tracking-tighter text-zinc-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,1)] animate-pulse"></span>
          ChatApp
        </Link>
        <div className="flex gap-8 items-center">
          <Link href="/features" className="text-sm font-medium text-blue-400">Features</Link>
          <Link href="/about" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">About</Link>
          <Link href="/auth-pages/login" className="text-sm font-medium bg-white text-black px-5 py-2 rounded-full hover:bg-zinc-200 transition-all">Login</Link>
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main className="relative z-10 pt-32 pb-24 px-6 max-w-7xl mx-auto">

        {/* Hero Header */}
        <section className="text-center mb-24">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-extrabold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500"
          >
            Built for the Way <br /> You Actually Communicate
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
          >
            Every feature in ChatApp was designed with one purpose to make your conversations faster, safer, and more expressive without ever getting in the way
          </motion.p>
        </section>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
          {detailedFeatures.map((feature, idx) => (
            <motion.div
              id={feature.id}
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500 scroll-mt-28"
            >
              <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h2 className="text-2xl font-bold mb-4 group-hover:text-blue-400 transition-colors">{feature.title}</h2>
              <p className="text-zinc-400 leading-relaxed mb-6">{feature.description}</p>
              <ul className="space-y-3">
                {feature.points.map((point, pIdx) => (
                  <li key={pIdx} className="flex items-center gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-500/60 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Tech Stack / Integration Section */}
        <section className="rounded-[3rem] bg-gradient-to-b from-blue-600/10 to-transparent border border-blue-500/20 p-12 text-center overflow-hidden relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">Built with Next-Gen Technology</h2>
            <p className="text-zinc-400 mb-12 max-w-lg mx-auto">Our stack is chosen for performance, security, and scale so you never have to think about the infrastructure</p>
            <div className="flex flex-wrap justify-center gap-12 md:gap-24">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <Cpu className="w-8 h-8 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-zinc-400">Three.js Graphics</span>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <Globe className="w-8 h-8 text-purple-400" />
                </div>
                <span className="text-sm font-medium text-zinc-400">Edge Networking</span>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-zinc-400">End-to-End Encryption</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to experience it?</h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto">Join thousands of people who chose privacy without sacrificing experience</p>
          <Link
            href="/auth-pages/register"
            className="inline-flex items-center justify-center px-10 py-4 text-lg font-medium text-white bg-blue-600 rounded-full hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_-10px_rgba(37,99,235,0.5)]"
          >
            Create Your Account
          </Link>
        </div>

      </main>

      {/* --- Footer --- */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-xl font-bold tracking-tighter text-zinc-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            ChatApp
          </div>
          <div className="flex gap-8 text-sm text-zinc-500">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/features" className="hover:text-white transition-colors text-blue-400">Features</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
          </div>
          <p className="text-sm text-zinc-600">© 2026 ChatApp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
