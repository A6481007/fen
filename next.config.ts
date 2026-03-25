import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // react-draft-wysiwyg popups (color/link/image/emoji/embed) break under React
  // Strict Mode because the library calls setState during mount. Disable
  // Strict Mode globally to keep the admin doc editor functional.
  reactStrictMode: false,

  // Force legacy /news/downloads traffic onto /catalog with a 301 to keep a single canonical target; legacy queries are dropped intentionally.
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
      {
        source: "/category",
        destination: "/products",
        permanent: true,
      },
      {
        source: "/category/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
      {
        source: "/product/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
      {
        source: "/resources",
        destination: "/news/resources",
        permanent: true,
      },
      {
        source: "/resources/:path*",
        destination: "/news/resources",
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
