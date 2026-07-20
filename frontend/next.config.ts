import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Next.js doesn't support Image Optimization API in export mode unless configured
  images: {
    unoptimized: true,
  }
};

export default nextConfig;
