import type { NextConfig } from "next";

// Config updated to trigger rebuild

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Disabled optimization to fix 500 errors on Windows Server
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  output: 'standalone',
};

export default nextConfig;
