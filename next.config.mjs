/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'bullmq', 'ioredis'],
};
export default nextConfig;
