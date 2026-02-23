import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  // 브라우저가 MIME 타입을 추측하지 못하게 함 (MIME 스니핑 공격 방지)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 다른 사이트에서 iframe으로 이 사이트를 삽입하지 못하게 함 (Clickjacking 방지)
  { key: "X-Frame-Options", value: "DENY" },
  // 브라우저 내장 XSS 필터 활성화
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // 외부 사이트로 이동 시 Referrer 정보 최소화
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 불필요한 브라우저 기능(카메라, 마이크, 위치) 비활성화
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // 모든 경로에 보안 헤더 적용
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Bundle analyzer wrapper for visual bundle size analysis
// Enable with ANALYZE=true environment variable
// @see https://www.npmjs.com/package/@next/bundle-analyzer
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Sentry wrapper configuration for source maps upload
// @see https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/
export default withSentryConfig(withNextIntl(withAnalyzer(nextConfig)), {
  // Sentry organization and project
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  // Create at: https://sentry.io/settings/auth-tokens/
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Source maps configuration
  sourcemaps: {
    // Disable source maps upload in development
    disable: process.env.NODE_ENV !== 'production',

    // Upload source maps for JavaScript files
    assets: ['**/*.js', '**/*.js.map'],

    // Ignore node_modules source maps
    ignore: ['**/node_modules/**'],

    // Delete source maps after upload to save disk space
    deleteSourcemapsAfterUpload: true,
  },

  // Optional: Tunnel route to bypass ad-blockers
  // This creates a route at /monitoring that proxies Sentry requests
  tunnelRoute: '/monitoring',

  // Silent mode to reduce noise in CI logs
  silent: !process.env.CI,

  // Keep existing Sentry options for widenClientFileUpload
  widenClientFileUpload: true,
});
