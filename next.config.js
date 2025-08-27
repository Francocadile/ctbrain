/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Hace que Vercel no requiera ESLint durante el build
    ignoreDuringBuilds: true,
  },
  // Opcional: si preferís que Next no intente exportar estático páginas con searchParams
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
