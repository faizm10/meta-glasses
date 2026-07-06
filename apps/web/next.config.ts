import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@auteur/api", "@auteur/contracts", "@auteur/db"],
};

export default nextConfig;
