'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await apiFetch(`/api/auth/verify-email?token=${token}`, {
          method: 'GET',
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          setTimeout(() => {
            router.push('/auth-pages/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Failed to verify email.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification.');
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <div className="bg-[#09090b]/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-zinc-800 p-10 text-center">
      <div className="flex justify-center mb-6">
        {status === 'loading' && (
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 border border-blue-500/20 rounded-2xl">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}
        {status === 'success' && (
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 border border-green-500/20 rounded-2xl shadow-[0_0_40px_-10px_rgba(34,197,94,0.5)]">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        )}
        {status === 'error' && (
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 border border-red-500/20 rounded-2xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.5)]">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        )}
      </div>
      
      <h1 className="text-2xl font-black text-zinc-100 tracking-tight mb-2">
        {status === 'loading' && 'Verifying...'}
        {status === 'success' && 'Verified!'}
        {status === 'error' && 'Verification Failed'}
      </h1>
      
      <p className="text-zinc-400 font-medium text-balance">
        {message}
      </p>

      {status === 'success' && (
        <p className="text-sm text-zinc-500 mt-6 animate-pulse">
          Redirecting to login...
        </p>
      )}

      {status === 'error' && (
        <button
          onClick={() => router.push('/auth-pages/login')}
          className="mt-8 w-full py-3 bg-zinc-800 text-zinc-100 font-bold rounded-2xl hover:bg-zinc-700 transition-all transform active:scale-[0.98]"
        >
          Go to Login
        </button>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-[40rem] w-[100%] max-w-[60rem] bg-blue-500/10 blur-[120px] rounded-full translate-y-[-20%]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="relative z-10 w-full max-w-[400px]"
      >
        <Suspense fallback={
          <div className="bg-[#09090b]/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-zinc-800 p-10 text-center">
            <div className="flex justify-center mb-6">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-black text-zinc-100 tracking-tight mb-2">Loading...</h1>
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </motion.div>
    </div>
  );
}
