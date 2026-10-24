import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Development only: the dev server is reached via 127.0.1.1 inside the VM. Has no effect on `next start`.
  allowedDevOrigins: ["127.0.1.1"],
};

export default nextConfig;
