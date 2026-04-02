import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendBaseUrl = "http://127.0.0.1:5000";
    return [
      {
        source: "/api/uploads/:path*",
        destination: `${backendBaseUrl}/api/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
