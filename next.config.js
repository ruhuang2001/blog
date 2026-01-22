module.exports = {
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'gravatar.com', pathname: '/**' },
      { protocol: 'https', hostname: 'og-image-craigary.vercel.app', pathname: '/**' },
      { protocol: 'https', hostname: 'fonts.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'fonts.gstatic.com', pathname: '/**' }
    ],
    formats: ['image/avif', 'image/webp']
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|ico|webp|avif|woff|woff2|ttf)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
      },
      {
        source: '/:path*{/}?',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'interest-cohort=()'
          }
        ]
      }
    ]
  },
  transpilePackages: ['dayjs']
}
