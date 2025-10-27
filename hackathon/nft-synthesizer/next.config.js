/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'via.placeholder.com',
      'images.unsplash.com',
      'picsum.photos',
      'ipfs.io',
      'arweave.net',
      'nftstorage.link',
      'cloudflare-ipfs.com',
      '*.ipfs.dweb.link'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig