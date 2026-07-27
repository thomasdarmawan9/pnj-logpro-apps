import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.mypnj.co.id",
          },
        ],
        destination: "https://mypnj.co.id/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
