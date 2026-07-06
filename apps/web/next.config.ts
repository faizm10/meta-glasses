import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@auteur/contracts", "@auteur/db"],
};

export default nextConfig;
