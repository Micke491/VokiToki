interface MessageStatusIconProps {
  status: 'sending' | 'failed' | 'sent' | 'delivered' | 'seen';
  className?: string;
}

export default function MessageStatusIcon({ status, className = "" }: MessageStatusIconProps) {
  if (status === 'sending') {
    return (
      <svg className={`w-3.5 h-3.5 text-chat-text-tertiary animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    );
  }

  if (status === 'failed') {
    return (
      <svg className={`w-3.5 h-3.5 text-red-500 hover:scale-115 active:scale-95 transition-transform cursor-pointer ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }

  if (status === 'seen') {
    return (
      <svg className={`w-4 h-4 text-chat-accent ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L7 17l-5-5" />
        <path d="M22 10l-7.5 7.5L13 16" />
      </svg>
    );
  }

  if (status === 'delivered') {
    return (
      <svg className={`w-4 h-4 text-chat-text-tertiary ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L7 17l-5-5" />
        <path d="M22 10l-7.5 7.5L13 16" />
      </svg>
    );
  }

  return (
    <svg className={`w-4 h-4 text-chat-text-tertiary ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
