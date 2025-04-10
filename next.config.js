/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['@prisma/client'],
    topLevelAwait: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
