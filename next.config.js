/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {}, // fix: must be object, not true
    serverExternalPackages: ['@prisma/client'], // renamed from deprecated key
    topLevelAwait: true, // still OK
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
