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
  }
};

module.exports = nextConfig;
