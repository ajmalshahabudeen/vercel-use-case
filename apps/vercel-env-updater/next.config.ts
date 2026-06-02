import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: [
    "@workspace/db",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],
  experimental: {
    // Prisma 7 generated client uses .js import specifiers for .ts files
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
    },
  },
  turbopack: {
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
};

export default nextConfig;
