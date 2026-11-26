import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl
  ? new URL(supabaseUrl).hostname
  : "*.supabase.co";

// Sent with every page. They stop other sites from embedding GoodsMandi in a
// frame (clickjacking), stop browsers guessing file types, and keep full page
// addresses out of the Referer header sent to other sites.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Don't tell every visitor which framework the site runs on
  poweredByHeader: false,
  // Azure App Service: BUILD_STANDALONE=1 makes `next build` produce a small, self-contained
  // server in .next/standalone (see .github/workflows/deploy-azure.yml). Off by default, so
  // Vercel and the CI build are unaffected.
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
