/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static site. `next build` writes ./out — no server, no backend, nothing to track you with.
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: false,
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
