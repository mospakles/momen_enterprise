import type { NextConfig } from "next";
import legacyBrandPaths from "./brand/legacy-map.json";

const nextConfig: NextConfig = {
  // Railway runs the app from a container. Standalone output keeps the
  // production image small and includes only the files the Next server needs.
  output: "standalone",
  images: {
    // Serve modern formats; the JPEGs in public/images/brand are the fallback.
    formats: ["image/avif", "image/webp"],
    // No remote stock-photo hosts: only brand photography (and admin uploads,
    // which render unoptimised) appears on the site.
  },
  // Brand photos were renamed in the curation pass (brand/curation.json);
  // old URLs redirect to the new names.
  async redirects() {
    return Object.entries(legacyBrandPaths as Record<string, string>).map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
