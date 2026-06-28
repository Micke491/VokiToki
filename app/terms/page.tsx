'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans px-4 py-12 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[100%] max-w-[60rem] h-[30rem] bg-blue-500/10 blur-[120px] rounded-full"></div>

      <div className="max-w-3xl mx-auto relative z-10">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 font-medium text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-[#09090b]/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-zinc-800 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-8">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-100">Terms of Service</h1>
              <p className="text-zinc-400 mt-1">Last updated: October 2023</p>
            </div>
          </div>

          <div className="space-y-8 text-zinc-300 leading-relaxed text-sm md:text-base">
            <section>
              <h2 className="text-xl font-bold text-zinc-100 mb-3">1. Acceptance of Terms</h2>
              <p>By accessing and using VokiToki, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our application.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-100 mb-3">2. User Conduct</h2>
              <p>You agree to use VokiToki only for lawful purposes. You must not use our platform to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-400">
                <li>Harass, abuse, or harm other users.</li>
                <li>Transmit spam, unauthorized advertisements, or illegal content.</li>
                <li>Attempt to bypass or compromise our security measures.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-100 mb-3">3. Account Security</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials. We highly recommend enabling Two-Factor Authentication (2FA) in your settings.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-100 mb-3">4. Termination</h2>
              <p>We reserve the right to suspend or terminate your account at any time for violations of these Terms, including excessive reports from other users.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}