import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.giphy.com https://giphy.com https://*.cloudinary.com https://res.cloudinary.com https://*.ytimg.com https://i.ytimg.com https://*.jsdelivr.net",
              "media-src 'self' blob: https://*.cloudinary.com https://res.cloudinary.com",
              "connect-src 'self' http://localhost:8081 http://127.0.0.1:8081 ws://localhost:8081 ws://127.0.0.1:8081 wss://vokitoki.onrender.com https://vokitoki.onrender.com https://api.giphy.com https://*.cloudinary.com https://res.cloudinary.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
