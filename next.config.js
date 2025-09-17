const path = require("path");
const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: { ignoreDuringBuilds: true }, // evita que frene el build si falta config
  webpack: (config) => {
    // Evitamos que pdfjs-dist arrastre tests/ejemplos
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /pdfjs-dist[\\/]test/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /pdfjs-dist[\\/]examples/ })
    );

    // Stub del worker en SSR (imprescindible)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
      "pdfjs-dist/build/pdf.worker.mjs": path.resolve(__dirname, "src/lib/pdf.worker.stub.js"),
      "pdfjs-dist/legacy/build/pdf.worker.js": path.resolve(__dirname, "src/lib/pdf.worker.stub.js")
    };

    return config;
  }
};

module.exports = nextConfig;
