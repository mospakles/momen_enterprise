import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Railway runs the app from a container. Standalone output keeps the
  // production image small and includes only the files the Next server needs.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
