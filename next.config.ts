import type { NextConfig } from "next";

const allowVercelLive =
  process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "production";
const vercelLiveSource = allowVercelLive ? " https://vercel.live" : "";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@walletconnect/solana-adapter",
    "@walletconnect/universal-provider",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Allow inline scripts/styles for Next.js and React
              `script-src 'self' 'unsafe-inline' 'unsafe-eval'${vercelLiveSource}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data: https://fonts.reown.com",
              // Allow HTTPS/WSS to any domain for custom RPC URLs
              // This is necessary for users to use their own RPC endpoints
              "connect-src 'self' https: wss:",
              `frame-src https://verify.walletconnect.org https://verify.walletconnect.com${vercelLiveSource}`,
              // Prevent framing
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // Upgrade insecure requests
              "upgrade-insecure-requests",
            ].join("; "),
          },
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
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), usb=(self)",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
