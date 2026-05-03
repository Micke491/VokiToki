"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
      // Slower, smoother rotation
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    // Reduced float speeds for a more ambient, less distracting feel
    <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
      {/* Reduced geometry from 64x64 to 48x48 to save mobile GPU memory */}
      <Sphere ref={meshRef} args={[2.2, 48, 48]} position={[0, 0, -1]}>
        <MeshDistortMaterial
          color="#93c5fd"
          emissive="#2563eb"
          emissiveIntensity={2}
          attach="material"
          distort={0.4} // Slightly less aggressive distortion
          speed={1.5} // Slower morphing speed
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

      <pointLight
        position={[0, 0, 0]}
        color="#60a5fa"
        intensity={15}
        distance={10}
      />
      <pointLight position={[-5, -5, -5]} color="#3b82f6" intensity={10} />
      <pointLight position={[5, 5, 5]} color="#8b5cf6" intensity={10} />

      <AbstractNetworkShape />

      {/* Reduced particle counts to prevent mobile overdraw lag */}
      <Sparkles
        count={120} // Down from 250
        scale={14}
        size={3}
        speed={0.4}
        opacity={0.6}
        color="#93c5fd"
      />
      <Sparkles
        count={60} // Down from 150
        scale={14}
        size={2}
        speed={0.2}
        opacity={0.4}
        color="#ffffff"
      />
    </>
  );
}

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const response = await fetch("/api/users/current_user", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          router.push("/chat");
        } else if (response.status === 401 || response.status === 404) {
          removeAuthToken();
        }
      } catch (err) {
        console.error("Session verification failed:", err);
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 font-sans flex flex-col selection:bg-blue-500/30 overflow-hidden">
      {/* --- 3D Background Layer --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 45 }}
          // Crucial for mobile: Cap pixel ratio to 1.5x to prevent extreme battery drain
          dpr={[1, 1.5]}
          // Request high performance from the device GPU
          gl={{ powerPreference: "high-performance", antialias: true }}
        >
          <Scene />
        </Canvas>
      </div>

      {/* Intensified Background Ambient Gradient */}
      <div className="pointer-events-none absolute inset-0 flex justify-center z-0">
        {/* Added transform-gpu and will-change-transform to stop CSS blur from causing mobile repaints */}
        <div className="h-[50rem] w-[100%] max-w-[70rem] bg-blue-500/20 blur-[100px] md:blur-[140px] rounded-full translate-y-[-15%] mix-blend-screen transform-gpu will-change-transform"></div>
      </div>

      {/* Navigation Layer */}
      <nav className="w-full bg-[#09090b]/40 backdrop-blur-lg flex items-center justify-between px-6 py-5 fixed top-0 left-0 right-0 z-50 transition-all border-b border-white/10">
        <div className="text-xl font-bold tracking-tighter text-zinc-100 flex items-center gap-2 drop-shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,1)] animate-pulse"></span>
          ChatApp
        </div>
        <div className="flex items-center gap-8">
          <Link
            href="/auth-pages/login"
            className="text-sm font-medium text-zinc-300 hover:text-white transition-colors duration-300 drop-shadow-sm"
          >
            Login
          </Link>
          <Link
            href="/auth-pages/register"
            className="text-sm font-medium bg-white text-[#09090b] px-5 py-2.5 rounded-full hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)]"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto mb-32 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 leading-[1.1] text-balance drop-shadow-sm">
            Connect in real-time <br />
            <span className="text-blue-400 bg-clip-text bg-gradient-to-r from-blue-300 to-blue-600 drop-shadow-lg">
              Simple and secure
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed text-balance font-light drop-shadow-md">
            Chat with friends, share media, and stay connected without any
            distractions. A clean interface built entirely for communication.
          </p>

          <div className="flex justify-center pt-8">
            <Link
              href="/auth-pages/register"
              className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-blue-600 rounded-full overflow-hidden transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-[0_0_40px_0px_rgba(59,130,246,0.6)] hover:shadow-[0_0_60px_5px_rgba(96,165,250,0.8)] border border-blue-400/50"
            >
              Start Chatting Now
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12 py-12">
          <div className="flex flex-col text-left group cursor-default">
            <h3 className="text-xl font-semibold text-white mb-4 tracking-tight group-hover:text-blue-300 transition-colors duration-300 drop-shadow-md">
              Instant Messaging
            </h3>
            <p className="text-zinc-300 leading-relaxed font-light text-base md:text-lg">
              Fast and reliable messaging. Get your words across instantly
              without delays, optimizing your daily communication flow.
            </p>
          </div>

          <div className="flex flex-col text-left group cursor-default">
            <h3 className="text-xl font-semibold text-white mb-4 tracking-tight group-hover:text-blue-300 transition-colors duration-300 drop-shadow-md">
              Media Sharing
            </h3>
            <p className="text-zinc-300 leading-relaxed font-light text-base md:text-lg">
              Share high-resolution photos, audio, and video effortlessly to
              make your private conversations significantly more engaging.
            </p>
          </div>

          <div className="flex flex-col text-left group cursor-default">
            <h3 className="text-xl font-semibold text-white mb-4 tracking-tight group-hover:text-blue-300 transition-colors duration-300 drop-shadow-md">
              Secure by Default
            </h3>
            <p className="text-zinc-300 leading-relaxed font-light text-base md:text-lg">
              Your conversations are kept strictly private with our sturdy,
              built-in, end-to-end encryption and security features.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
