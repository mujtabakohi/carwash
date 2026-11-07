/** @type {import('next').NextConfig} */
const origin = process.env.ALLOWED_ORIGIN; // e.g. https://pos.example.com  (leave empty when the UI is served from this same app)

const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['better-sqlite3'] },
  // Serve the POS page at the site root (public/index.html)
  async rewrites() { return [{ source: '/', destination: '/index.html' }]; },
  async headers() {
    if (!origin) return [];
    return [{
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: origin },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        { key: 'Vary', value: 'Origin' },
      ],
    }];
  },
};
export default nextConfig;
