import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Scans arrive as page images posted from the browser.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
