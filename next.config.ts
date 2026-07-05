import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // Serve the marketing page (public/marketing.html) as the homepage.
        { source: "/", destination: "/marketing.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
