'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LifeBuoy, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQS = [
  {
    q: "How do I start a voice or video call?",
    a: "Open any chat conversation and look for the phone or video camera icons in the top right corner of the chat header. Click them to initiate a call."
  },
  {
    q: "How does the AI Assistant work?",
    a: "VokiToki features an integrated AI. Click 'AI Assistant' in the sidebar to chat with it. You can change its personality (Friendly, Coding, Coach, Sarcastic) in Settings > AI Assistant."
  },
  {
    q: "How do I enable Two-Factor Authentication (2FA)?",
    a: "Go to Settings > Privacy & Security, and click 'Setup 2FA'. We will send a code to your registered email to verify and enable the feature."
  },
  {
    q: "How long do stories last?",
    a: "Stories automatically expire and are deleted 24 hours after they are posted."
  },
  {
    q: "How do I block someone?",
    a: "Open a chat with the user, click the three-dot menu in the chat list, and select 'Block User'. You can manage blocked users in your Privacy Settings."
  }
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[100%] max-w-[60rem] h-[30rem] bg-emerald-500/10 blur-[120px] rounded-full"></div>

      <div className="max-w-3xl mx-auto relative z-10">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 font-medium text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-[#09090b]/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-zinc-800 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <LifeBuoy className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-100">Help & Support</h1>
              <p className="text-zinc-400 mt-1">Frequently asked questions and guides</p>
            </div>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <div key={index} className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/30">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                >
                  <span className="font-bold text-zinc-200">{faq.q}</span>
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-500" />
                  )}
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-5 pb-5 text-zinc-400 text-sm leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-center">
            <h3 className="font-bold text-zinc-100 mb-2">Still need help?</h3>
            <p className="text-sm text-zinc-400 mb-4">Check out our documentation on GitHub or open an issue.</p>
            <a 
              href="https://github.com/Micke491/chat-app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors text-sm"
            >
              Visit Repository
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}