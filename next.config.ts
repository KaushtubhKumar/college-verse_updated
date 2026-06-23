import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
  // Reduce cold start time
  experimental: {
    optimizePackageImports: ["next-auth", "zustand"],
  },
};

export default nextConfig;
