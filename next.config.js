/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // Evitar que falle el build por no tener ESLint instalado/configurado
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
