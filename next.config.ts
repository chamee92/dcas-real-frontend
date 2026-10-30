import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "example.com",
      },
      {
        protocol: "https",
        hostname: "api-tour-manage.aventureit.com",
      },
      {
        protocol: "http",
        hostname: "api-tour-manage.aventureit.com",
      },
      {
        protocol: "https",
        hostname: "*.aventureit.com",
      },
      {
        protocol: "https",
        hostname: "cdn.yoursite.com",
      },
      {
        protocol: "https",
        hostname: "easycredit-storage.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
