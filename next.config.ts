import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Enable Turbopack for development and production builds.
   * Note: Bundle size budgets are configured in webpack for webpack builds.
   * Turbopack doesn't currently support performance budgets.
   */
  turbopack: {},

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos", // Placeholder images for seed data
      },
      {
        protocol: "https",
        hostname: "*.r2.dev", // Cloudflare R2 public buckets
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com", // R2 custom domains
      },
      {
        protocol: "https",
        hostname: "imagedelivery.net", // Cloudflare Images
      },
      {
        protocol: "https",
        hostname: "*.cloudflarestream.com", // Stream thumbnails
      },
      {
        protocol: "https",
        hostname: "img.clerk.com", // Clerk user avatars
      },
    ],
  },

  /**
   * Webpack configuration for bundle size budgets
   * Per PRD performance requirements:
   * - Max asset size: 200KB
   * - Max entrypoint size: 300KB
   */
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Set performance budgets for client-side bundles
      config.performance = {
        maxAssetSize: 200000, // 200KB
        maxEntrypointSize: 300000, // 300KB
        hints: "warning", // warn but don't fail build
      };
    }
    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.breathwithmagic.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.clerk.accounts.dev https://clerk.breathwithmagic.com https://api.stripe.com",
              "frame-src 'self' https://*.clerk.accounts.dev https://clerk.breathwithmagic.com https://js.stripe.com",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
