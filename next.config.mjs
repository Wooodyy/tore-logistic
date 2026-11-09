/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable Turbopack if you encounter internal errors
  // Uncomment the line below if the error persists
  // experimental: {
  //   turbo: false,
  // },
}

export default nextConfig
