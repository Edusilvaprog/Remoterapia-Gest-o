import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  logging: { serverFunctions: false },
  async headers() {
    const localVisualPreview = process.env.NODE_ENV === 'development'

    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      ...(!localVisualPreview ? [{ key: 'X-Frame-Options', value: 'DENY' }] : []),
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: localVisualPreview ? "frame-ancestors http://127.0.0.1:3010 http://localhost:3010; base-uri 'self'; object-src 'none'" : "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
    ] }]
  },
};
export default nextConfig;
