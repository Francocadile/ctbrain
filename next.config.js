const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    // Bloquear cualquier import accidental a los ejemplos o tests de PDF.js
    const empty = path.resolve(__dirname, "src/lib/empty.js");
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pdfjs-dist/examples": empty,
      "pdfjs-dist/test": empty,
      "pdfjs-dist/examples/node/getinfo.js": empty,
      "pdfjs-dist/examples/node/getinfo.mjs": empty,
    };

    return config;
  },
};

module.exports = nextConfig;
