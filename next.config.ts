import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure Turbopack resolves deps/config from this app folder in a workspace repo.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
