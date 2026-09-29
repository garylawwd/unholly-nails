import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "presson-pro.firebasestorage.app",
      },
    ],
  },
  allowedDevOrigins: [
    "192.168.1.247",
    "http://192.168.1.247",
    "http://192.168.1.247:3000"
  ],
};

export default nextConfig;
