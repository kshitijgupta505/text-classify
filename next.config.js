/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', ← remove or comment this line
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
