import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The dev server is reached via 127.0.1.1 inside the VM.
  allowedDevOrigins: ["127.0.1.1"],
};

export default nextConfig;
