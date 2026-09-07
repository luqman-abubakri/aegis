import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse uses a legacy PDF.js build with dynamic internal requires.
  // Keep it in the Node.js runtime instead of bundling it into the route.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
