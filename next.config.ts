import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // csv-parser uses Node.js streams — must be kept server-side only
  serverExternalPackages: ["csv-parser"],
  images: {
    // Allow all hostnames for logo/player images (CDNs, etc.)
    unoptimized: true,
  },
};

export default nextConfig;
