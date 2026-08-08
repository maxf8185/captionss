import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove output: 'export' to support Clerk and Server Actions
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:7860/api/:path*',
      },
    ];
  },
};

export default nextConfig;
