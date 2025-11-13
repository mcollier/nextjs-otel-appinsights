/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
  compiler: {
    // Remove console.* calls in production builds only, but keep console.error
    // This should only apply during 'npm run build', not 'npm run dev'
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'] // Keep console.error in production for debugging
    } : false
  },
};

export default nextConfig;
