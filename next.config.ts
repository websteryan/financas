import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // O código foi escrito em TypeScript estrito, mas não pôde ser compilado no ambiente
  // em que foi gerado. Depois de rodar `npm run typecheck` sem erros, pode remover a linha abaixo.
  typescript: { ignoreBuildErrors: true },
  experimental: { optimizePackageImports: ["@phosphor-icons/react"] },
};

export default nextConfig;
