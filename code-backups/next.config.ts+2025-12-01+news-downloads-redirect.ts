import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // 301 legacy downloads traffic to the new catalog page; keep destination stable to avoid redirect loops.
  async redirects() {
    return [
      {
        source: "/news/downloads",
        destination: "/catalog",
        permanent: true,
      },
      {
        source: "/news/downloads/:path*",
        destination: "/catalog",
        permanent: true,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
};

export default nextConfig;
