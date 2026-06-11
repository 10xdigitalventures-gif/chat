import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
