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
    // pdfjs-dist loads its worker via dynamic import, so Next's tracer misses it.
    // Force-include the worker + cmaps + fonts in the standalone bundle.
    outputFileTracingIncludes: {
      "/api/extract": [
        "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
        "./node_modules/pdfjs-dist/cmaps/**",
        "./node_modules/pdfjs-dist/standard_fonts/**",
      ],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("better-sqlite3", "pdf-parse", "pdf-lib", "pdfjs-dist", "@napi-rs/canvas", "mammoth", "xlsx");
    }
    return config;
  },
};

export default nextConfig;
