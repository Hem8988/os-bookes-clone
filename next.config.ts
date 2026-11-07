import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Native canvas (renders invoice PDFs to read the e-invoice QR) must be loaded by Node, not bundled.
  // Baileys (built-in WhatsApp gateway) keeps live sockets and has optional native deps: load it with Node too.
  serverExternalPackages: ["@napi-rs/canvas", "@whiskeysockets/baileys", "pino", "qrcode"],
};

export default nextConfig;
