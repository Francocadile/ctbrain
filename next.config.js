const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    // Bloquear que entren ejemplos/tests de pdfjs-dist al bundle del endpoint
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /pdfjs-dist[\\/]examples/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /pdfjs-dist[\\/]test/ })
    );

    return config;
  },
};

module.exports = nextConfig;
