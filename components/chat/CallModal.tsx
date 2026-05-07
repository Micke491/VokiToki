"use client";

import React from "react";

// Kept the props so TypeScript doesn't complain in your parent components
interface CallModalProps {
  onLeave?: () => void;
  chatId?: string;
  callType?: "voice" | "video";
  username?: string;
}

export default function CallModal({ onLeave }: CallModalProps) {
  // We immediately call onLeave if this is ever rendered to prevent the app from getting "stuck"
  React.useEffect(() => {
    if (onLeave) onLeave();
  }, [onLeave]);

  return null; // Renders nothing to avoid UI errors
}