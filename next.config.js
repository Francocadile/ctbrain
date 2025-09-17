const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    // Evitar que pdfjs-dist arrastre cosas que no usamos en SSR
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /pdfjs-dist[\\/]test/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /pdfjs-dist[\\/]examples/ })
    );
    // En SSR no renderizamos, así que desactivamos canvas/worker
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
      "pdfjs-dist/build/pdf.worker.mjs": false
    };
    return config;
  }
};

module.exports = nextConfig;
