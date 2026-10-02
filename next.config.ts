import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Native canvas (renders invoice PDFs to read the e-invoice QR) must be loaded by Node, not bundled.
  serverExternalPackages: ["@napi-rs/canvas"],
};

export default nextConfig;
