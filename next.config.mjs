import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    return config;
  },
};

export default nextConfig;

