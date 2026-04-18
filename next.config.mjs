/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Ensure better-sqlite3 native module is available at runtime
  experimental: {
    serverComponentsExternalPackages: [
      "better-sqlite3",
      "pdf-parse",
      "pdf-lib",
      "pdfjs-dist",
      "@napi-rs/canvas",
      "mammoth",
      "xlsx",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("better-sqlite3", "pdf-parse", "pdf-lib", "pdfjs-dist", "@napi-rs/canvas", "mammoth", "xlsx");
    }
    return config;
  },
};

export default nextConfig;
