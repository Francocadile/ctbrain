// next.config.js
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Evitar que PDF.js ESM intente importar el worker real en SSR
    config.resolve.alias["pdfjs-dist/build/pdf.worker.mjs"] = path.resolve(
      __dirname,
      "src/lib/pdf.worker.stub.js"
    );
    return config;
  }
};

module.exports = nextConfig;
