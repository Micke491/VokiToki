"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles, Float, Sphere, MeshDistortMaterial } from "@react-three/drei";
import { motion } from "framer-motion";
import {
  Users,
  Eye,
  Heart,
  Code2,
  Github,
} from "lucide-react";

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

const values =[
  {
    title: "Privacy First",
    description: "We believe privacy is a fundamental human right, not a selling point. We architect every system so that even we cannot read your messages because we never should",
    icon: Eye,
    color: "text-blue-400"
  },
  {
    title: "People Over Product",
    description: "Every feature starts with a single question: does this make someone's life genuinely better? We build tools that serve people, not tools that exploit attention",
    icon: Heart,
    color: "text-red-400"
  },
  {
    title: "Open & Transparent",
    description: "We believe trust is earned through openness. Our codebase is available for public audit, our roadmap is shared, and our policies are written in plain language",
    icon: Code2,
    color: "text-emerald-400"
  }
];

export default function AboutPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  },[]);

  if (!isMounted) return null;

  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-blue-500/30 overflow-x-hidden">

      {/* --- Persistent Background --- */}
      {/* Exclude 3D Canvas completely on mobile */}
      {!isMobile && (
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
          <Link href="/features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Features</Link>
          <Link href="/about" className="text-sm font-medium text-blue-400">About</Link>
          {/* Hide Login on mobile */}
          {!isMobile && (
            <Link href="/auth-pages/login" className="text-sm font-medium bg-white text-black px-5 py-2 rounded-full hover:bg-zinc-200 transition-all">Login</Link>
          )}
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main className="relative z-10 pt-40 pb-24 px-6 max-w-5xl mx-auto">

        {/* Mission Statement */}
        <section className="text-center mb-32">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500"
          >
            Built for Connection <br />Designed for Privacy
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed"
          >
            Founded in 2026, ChatApp was created out of frustration with messaging platforms that treat users as a product.
            We set out to build something radically different a communication tool that is fast, beautiful, and private by design.
            No advertising, no profiling, no compromise
          </motion.p>
        </section>

        {/* Story Section */}
        <section className="mb-32 relative rounded-[3rem] overflow-hidden p-10 md:p-16 bg-white/[0.02] border border-white/[0.05]">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-bold mb-6">The Story Behind ChatApp</h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              Most chat apps are built around engagement metrics keeping you glued to a screen. ChatApp was built around a different metric <span className="text-zinc-200 font-medium">TRUST</span>
            </p>
            <p className="text-zinc-400 leading-relaxed mb-4">
              I built this app because everything in that statement is actually true. And without this, I'd still be watching my conversations become data points in someone else's ad machine. So I built the app I'd always wanted to use lean, encrypted, and entirely in my control. It wasn't marketing speak. It was the thing I needed to exist
            </p>
            <p className="text-zinc-400 leading-relaxed">
              Today, every line of code we write still asks the same question it did on day one: <span className="text-zinc-200 font-medium">does this protect and serve the person using it?</span>
            </p>
          </div>
        </section>

        {/* Values Grid */}
        <section className="mb-32">
          <h2 className="text-3xl font-bold mb-12 text-center">What Drives Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((value, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.06] transition-all"
              >
                <value.icon className={`w-8 h-8 ${value.color} mb-6`} />
                <h3 className="text-xl font-bold mb-4">{value.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Vision Section */}
        <section className="relative rounded-[3rem] overflow-hidden p-12 bg-white/[0.02] border border-white/[0.05]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Building for the Future</h2>
              <p className="text-zinc-400 leading-relaxed mb-6">
                We're not just building a messaging app, we're building an ecosystem where privacy and experience coexist without compromise. Our roadmap includes decentralized message storage, private AI-powered search of your own history, and seamless cross-platform experiences that respect your time
              </p>
              <div className="flex gap-4">
                <Link
                  href="https://github.com/Micke491/chat-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="ChatApp on GitHub"
                  className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 hover:border-white/20"
                >
                  <Github className="w-5 h-5 text-zinc-300" />
                </Link>
              </div>
            </div>
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800')] opacity-20 mix-blend-overlay group-hover:scale-110 transition-transform duration-700" />
              <div className="relative z-10 text-center">
                <div className="text-4xl font-bold text-white mb-2">100%</div>
                <div className="text-sm text-zinc-400 font-medium">User Owned Data</div>
              </div>
            </div>
          </div>
        </section>

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
            <Link href="/features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/about" className="hover:text-white transition-colors text-blue-400">About</Link>
          </div>
          <p className="text-sm text-zinc-600">© 2026 ChatApp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}