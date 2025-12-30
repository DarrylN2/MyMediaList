/** @type {import('next').NextConfig} */
console.log('[MyMediaList] loading next.config.js from', __dirname)
const nextConfig = {
  // Ensure build always has a generator function; returning null lets Next pick a safe fallback.
  generateBuildId: async () => null,
  // Keep file tracing consistent when deploying from a subdirectory (e.g. Vercel Root Directory = `web`).
  outputFileTracingRoot: __dirname,
  turbopack: {
    // This repo contains multiple lockfiles (root + web/). Pin Turbopack to this package.
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
        pathname: '/file/anilistcdn/**',
      },
      {
        protocol: 'https',
        hostname: 'images.igdb.com',
        pathname: '/igdb/image/upload/**',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        pathname: '/image/**',
      },
      {
        protocol: 'https',
        hostname: 'mosaic.scdn.co',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
