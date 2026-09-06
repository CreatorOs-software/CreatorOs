import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.dev", "*.trycloudflare.com"],
  // @talentos/ui and @talentos/ui-tokens are local `file:` deps that live
  // as sibling directories outside this project root (symlinked in
  // node_modules) — Turbopack needs this to resolve/traverse them.
  experimental: {
    externalDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
