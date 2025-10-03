/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: { ignoreDuringBuilds: true },

  webpack: (config) => {
    // Si quedó algún import viejo accidental de pdfjs-dist, lo ignoramos
    const webpack = require("webpack");
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /pdfjs-dist/ })
    );
    return config;
  },

  async rewrites() {
    return [
      // API legacy → nuevo namespace
      { source: "/api/med/:path*", destination: "/api/medico/:path*" },
    ];
  },

  async redirects() {
    return [
      // Páginas legacy → nuevo namespace
      { source: "/med/:path*", destination: "/medico/:path*", permanent: true },
    ];
  },
};

module.exports = nextConfig;
