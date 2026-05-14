"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ExternalLink } from "lucide-react";

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
}

interface LinkPreviewProps {
  url: string;
}

const previewCache = new Map<string, LinkPreviewData>();

export default function LinkPreview({ url }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkPreviewData | null>(previewCache.get(url) || null);
  const [loading, setLoading] = useState(!previewCache.has(url));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (previewCache.has(url)) return;
    
    let isMounted = true;

    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/url-metadata?url=${encodeURIComponent(url)}`);

        if (!response.ok) throw new Error("Failed to fetch metadata");
        const data = await response.json();

        if (isMounted) {
          previewCache.set(url, data);
          setMetadata(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("LinkPreview error:", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-2 w-full max-w-[400px] h-24 bg-chat-bg-secondary rounded-xl animate-pulse border border-chat-border" />
    );
  }

  if (error || !metadata || (!metadata.title && !metadata.description)) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex flex-col sm:flex-row w-full max-w-[400px] bg-chat-bg-secondary border border-chat-border rounded-xl overflow-hidden hover:bg-chat-hover transition-colors group no-underline"
    >
      {metadata.image && (
        <div className="sm:w-32 h-32 sm:h-auto shrink-0 relative overflow-hidden bg-chat-bg-secondary/50">
          <img
            src={metadata.image}
            alt={metadata.title || "Preview"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-3 flex flex-col justify-between flex-1 min-w-0">
        <div className="space-y-1">
          {metadata.title && (
            <h4 className="text-sm font-semibold text-chat-text-primary line-clamp-1 break-words">
              {metadata.title}
            </h4>
          )}
          {metadata.description && (
            <p className="text-xs text-chat-text-tertiary line-clamp-2 break-words leading-relaxed">
              {metadata.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-2 overflow-hidden">
          <ExternalLink className="w-3 h-3 text-chat-accent shrink-0" />
          <span className="text-[10px] font-medium text-chat-text-tertiary truncate">
            {new URL(url).hostname}
          </span>
        </div>
      </div>
    </a>
  );
}
