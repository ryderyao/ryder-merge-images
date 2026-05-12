import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: projectRoot,
  redirects: (): Promise<Array<{ source: string; destination: string; permanent: boolean }>> =>
    Promise.resolve([{ source: "/dashboard", destination: "/", permanent: true }]),
};

export default nextConfig;
