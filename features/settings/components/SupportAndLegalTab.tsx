'use client';

import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  FileText,
  Flag,
  LifeBuoy,
  ShieldCheck,
} from 'lucide-react';

const resources = [
  {
    title: 'Help & Support',
    description: 'Find answers to common questions and get help with VokiToki.',
    href: '/help',
    icon: LifeBuoy,
    iconClassName: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  {
    title: 'Terms of Service',
    description: 'Read the terms that apply when you use VokiToki.',
    href: '/terms',
    icon: FileText,
    iconClassName: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  {
    title: 'Privacy Policy',
    description: 'Learn how we collect, use, and protect your information.',
    href: '/privacy',
    icon: ShieldCheck,
    iconClassName: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  },
  {
    title: 'Moderation Policy',
    description: 'Understand reporting, enforcement, and account review.',
    href: '/moderation',
    icon: Flag,
    iconClassName: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
] as const;

export default function SupportAndLegalTab() {
  const router = useRouter();

  return (
    <div>
      <div className="mb-6">
        <h2 className="flex items-center gap-3 text-xl font-bold text-chat-text-primary">
          <LifeBuoy className="h-6 w-6 text-chat-accent" />
          Support & Legal
        </h2>
        <p className="mt-2 text-sm text-chat-text-secondary">
          Help, policies, and important information about your account.
        </p>
      </div>

      <div className="divide-y divide-chat-border overflow-hidden rounded-2xl border border-chat-border bg-chat-input">
        {resources.map((resource) => {
          const Icon = resource.icon;

          return (
            <button
              key={resource.href}
              type="button"
              onClick={() => router.push(resource.href)}
              className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-chat-hover sm:p-5"
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${resource.iconClassName}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-chat-text-primary">{resource.title}</span>
                <span className="mt-1 block text-sm leading-snug text-chat-text-secondary">{resource.description}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-chat-text-tertiary" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
