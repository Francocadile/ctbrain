/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  typescript: {
    ignoreBuildErrors: true
  }
};
module.exports = nextConfig;
