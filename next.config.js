const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    // Por si algún paquete intenta arrastrar assets/ejemplos de pdfjs-dist:
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /pdfjs-dist[\\/]examples/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /pdfjs-dist[\\/]test/ })
    );
    return config;
  },
};

module.exports = nextConfig;
