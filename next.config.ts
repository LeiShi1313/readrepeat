import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Ensure server-side packages are properly bundled
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
