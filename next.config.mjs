/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep validation builds separate from a running development server.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  // Retire the old app-disk upload namespace, including files left in public/.
  async redirects() {
    return [{ source: '/uploads/:path*', destination: '/api/uploads/retired', permanent: false }];
  },
  images: {
    formats: ['image/webp'],
    dangerouslyAllowSVG: false,
    maximumResponseBody: 10 * 1024 * 1024,
    maximumDiskCacheSize: 256 * 1024 * 1024,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
