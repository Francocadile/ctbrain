import path from "path";
import webpack from "webpack";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    // Mantener el flujo actual de build sin fallar por ESLint;
    // el gate de calidad se corre explícitamente con `npm run lint`.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(process.cwd(), "src"),
    };

    // Si quedó algún import viejo accidental de pdfjs-dist, lo ignoramos
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /pdfjs-dist/ }),
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
  outputFileTracingExcludes: {
    "*": [
      "apps/**",
      "**/apps/**",
      "**/android/**",
      "**/ios/**",
      "**/Pods/**",
    ],
  },
};

export default nextConfig;

