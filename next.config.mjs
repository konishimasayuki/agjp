/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/medical", destination: "/medical/index.html" },
    ];
  },
};
export default nextConfig;
