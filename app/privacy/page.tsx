'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[100%] max-w-[60rem] h-[30rem] bg-indigo-500/10 blur-[120px] rounded-full"></div>

      <div className="max-w-3xl mx-auto relative z-10">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 font-medium text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-[#09090b]/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-zinc-800 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-8">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-100">Privacy Policy</h1>
              <p className="text-zinc-400 mt-1">Last updated: October 2023</p>
            </div>
          </div>

          <div className="space-y-8 text-zinc-300 leading-relaxed text-sm md:text-base">
            <section>
              <h2 className="text-xl font-bold text-zinc-100 mb-3">1. Information We Collect</h2>
              <p>We collect information you provide directly to us, including your username, email address, profile picture, and the messages/media you transmit through VokiToki.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-100 mb-3">2. How We Use Your Information</h2>
              <p>Your information is used solely to provide, maintain, and improve our services. We use WebRTC for calls, meaning audio and video streams are peer-to-peer when possible and not stored on our servers.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-100 mb-3">3. Data Security</h2>
              <p>We implement standard security measures, including JSON Web Tokens (JWT) for authentication and bcrypt for password hashing. However, no electronic transmission over the internet is entirely secure.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-zinc-100 mb-3">4. Data Deletion</h2>
              <p>You may request the deletion of your account at any time through the "Danger Zone" in your settings. Deleting your account will permanently remove your personal data from our active databases.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}