/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['@prisma/client'],
    topLevelAwait: true
  }
};

module.exports = nextConfig;
