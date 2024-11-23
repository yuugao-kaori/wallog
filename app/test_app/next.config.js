
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [process.env.NEXT_PUBLIC_SITE_DOMAIN?.replace(/^https?:\/\//, '')].filter(Boolean),
  },
}

module.exports = nextConfig