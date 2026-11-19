import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Security headers sent with every response. The Content-Security-Policy (with a
// per-request nonce) is set in src/proxy.ts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()",
  },
  // Force HTTPS for 2 years once the site runs on a real domain with SSL.
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Modern formats first: AVIF is ~50% smaller than JPEG, WebP ~30%.
    formats: ["image/avif", "image/webp"],
    // Uploaded files get a new random name on every upload, so they never change.
    minimumCacheTTL: 31536000,
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600],
    imageSizes: [48, 76, 96, 128, 180, 220, 320],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Uploaded images never change (random file names), so browsers keep them for a year.
      { source: "/uploads/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" }, // image uploads (max 5MB each)
  },
};

export default nextConfig;
