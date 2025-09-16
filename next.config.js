/** @type {import('next').NextConfig} */
const nextConfig = {
  // No necesitamos alias de pdfjs ni workers: usamos pdf-parse en SSR.
  reactStrictMode: false
};

module.exports = nextConfig;
