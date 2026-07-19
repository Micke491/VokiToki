'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

const sections = [
  ['1. Acceptance of Terms', 'By creating an account or using VokiToki, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the service.'],
  ['2. Eligibility and Account Security', 'You must provide accurate account information and keep your credentials confidential. You are responsible for activity on your account. Do not create an account if you are below the minimum age required by the laws that apply to you.'],
  ['3. Acceptable Use', 'You must not use VokiToki to harass, threaten, abuse, impersonate, exploit, or harm others; send spam or unauthorized advertising; share illegal, infringing, or harmful material; evade a restriction; or interfere with the security or operation of the service.'],
  ['4. Moderation and Enforcement', 'We may investigate reports and remove content, limit features, mute, suspend, or permanently terminate an account that violates these Terms or creates a safety or security risk. We may act immediately for serious violations. Where appropriate, we will explain the action and provide a way to contact us about it. Read our Moderation Policy for more detail.'],
  ['5. Your Content', 'You keep ownership of content you submit. You give VokiToki the limited permission needed to host, process, transmit, display, and store that content to operate and improve the service, enforce these Terms, and keep users safe. You must have the rights needed to share your content.'],
  ['6. Availability and Changes', 'We may change, suspend, or discontinue features when reasonably necessary. We may update these Terms; material changes will be announced through the service or another reasonable channel. Continuing to use VokiToki after the effective date means you accept the updated Terms.'],
  ['7. Disclaimers and Liability', 'VokiToki is provided on an “as available” basis. To the extent permitted by law, we do not guarantee uninterrupted, error-free, or completely secure service. Nothing in these Terms limits rights that cannot legally be limited.'],
  ['8. Contact and Governing Law', 'Before publishing, replace the contact placeholder below with the legal name, address, support email, governing-law jurisdiction, and dispute process that apply to the operator of VokiToki.'],
];

export default function TermsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-12 font-sans text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <button onClick={() => router.back()} className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
          <ArrowLeft size={16} /> Back
        </button>
        <article className="rounded-[2.5rem] border border-zinc-800 bg-[#09090b]/80 p-8 shadow-2xl backdrop-blur-2xl md:p-12">
          <header className="mb-8 flex items-center gap-4 border-b border-zinc-800 pb-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-600/10"><FileText className="h-6 w-6 text-blue-500" /></div>
            <div><h1 className="text-3xl font-black tracking-tight">Terms of Service</h1><p className="mt-1 text-zinc-400">Last updated: July 19, 2026</p></div>
          </header>
          <div className="space-y-8 text-sm leading-relaxed text-zinc-300 md:text-base">
            {sections.map(([title, body]) => <section key={title}><h2 className="mb-3 text-xl font-bold text-zinc-100">{title}</h2><p>{body}</p></section>)}
            <section className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5"><h2 className="mb-2 text-lg font-bold text-amber-100">Action required before launch</h2><p className="text-amber-50/80">Add the operator&apos;s legal identity, address, support email, governing law, and dispute process. This template is not a substitute for legal advice.</p></section>
            <p className="text-zinc-400">See the <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link> and <Link href="/moderation" className="text-blue-400 hover:underline">Moderation Policy</Link>.</p>
          </div>
        </article>
      </div>
    </main>
  );
}
