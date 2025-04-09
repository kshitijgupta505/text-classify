import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      'img.clerk.com',
      'images.clerk.dev'
    ]
  },
};

export default nextConfig;
// kshitij505

// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Add this line
  },
};

module.exports = nextConfig;
