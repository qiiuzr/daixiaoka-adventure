import type { NextConfig } from 'next';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: process.env.GITHUB_ACTIONS ? 'export' : undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: false,
};

export default nextConfig;
