import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Railway runs the app from a container. Standalone output keeps the
  // production image small and includes only the files the Next server needs.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      // Placeholder editorial photography for the brand journey — see
      // src/components/journey/media.ts. Remove once brand shoots are in.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
