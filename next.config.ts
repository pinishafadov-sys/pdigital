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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" }, // image uploads (max 5MB each)
  },
};

export default nextConfig;
