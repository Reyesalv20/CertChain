/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Rewrite same-origin: el navegador le pega a "/blockchain/*" y Next.js
  // reenvía al blockchain-service por atrás. Evita CORS (Firefox bloquea el
  // fetch cross-origin a localhost:6000).
  async rewrites() {
    const blockchainService =
      process.env.NEXT_PUBLIC_BLOCKCHAIN_SERVICE_URL ?? 'http://localhost:6000';
    return [
      {
        source: '/blockchain/:path*',
        destination: `${blockchainService}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
