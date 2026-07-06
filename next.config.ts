import type { NextConfig } from "next";

import { getSecurityResponseHeaders } from "./src/shared/security/httpHeaders";

const nextConfig: NextConfig = {
  devIndicators: false,

  turbopack: {
    root: __dirname,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityResponseHeaders(),
      },
    ];
  },
};

export default nextConfig;
