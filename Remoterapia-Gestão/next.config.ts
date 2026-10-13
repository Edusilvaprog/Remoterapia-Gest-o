import type { NextConfig } from "next";
if(process.env.NEXT_PUBLIC_LOCAL_PREVIEW==='1'&&process.env.NODE_ENV==='production'&&process.env.RT_BUILD_CHECK!=='1')throw new Error('Esta é uma prévia local. Revise a versão e desative o modo local antes de publicar.');
const nextConfig: NextConfig = {
  devIndicators: false,
  distDir: process.env.RT_BUILD_CHECK === '1' ? '.next-check' : '.next',
  poweredByHeader: false,
  logging: { serverFunctions: false },
  async headers() {
    const localVisualPreview = process.env.NODE_ENV === 'development'
    const localMemoryPolicy = localVisualPreview && process.env.NEXT_PUBLIC_LOCAL_PREVIEW === '1' ? "; connect-src 'self' http://localhost:3010 http://127.0.0.1:3010 ws://localhost:3015 ws://127.0.0.1:3015 ws://localhost:3016 ws://127.0.0.1:3016; form-action 'self'" : ''

    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      ...(!localVisualPreview ? [{ key: 'X-Frame-Options', value: 'DENY' }] : []),
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: localVisualPreview ? "frame-ancestors http://127.0.0.1:3010 http://localhost:3010; base-uri 'self'; object-src 'none'" + localMemoryPolicy : "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
    ] }]
  },
};
export default nextConfig;
