/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Ensure better-sqlite3 native module is available at runtime
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("better-sqlite3");
    }
    return config;
  },
};

export default nextConfig;
