import React from "react";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export function Logo({ className = "", iconClassName = "", textClassName = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      <div className={`shrink-0 flex items-center justify-center transition-transform duration-500 group-hover:rotate-[180deg] ${iconClassName || 'w-8 h-8 md:w-10 md:h-10'}`}>
        <svg width="100%" height="100%" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="4" fill="#2563eb" />
          <path
            d="M12 10 Q7 16 12 22"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M9 7 Q2 16 9 25"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M20 10 Q25 16 20 22"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M23 7 Q30 16 23 25"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>
      <span className={`font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight ${textClassName || 'text-lg md:text-xl'}`}>
        Vokitoki
      </span>
    </div>
  );
}
