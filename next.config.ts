import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Native canvas (renders invoice PDFs to read the e-invoice QR) must be loaded by Node, not bundled.
  // Baileys (built-in WhatsApp gateway) keeps live sockets and has optional native deps: load it with Node too.
  // puppeteer-core drives the system Chromium that prints invoice PDFs for WhatsApp.
  serverExternalPackages: ["@napi-rs/canvas", "@whiskeysockets/baileys", "pino", "qrcode", "puppeteer-core"],
};

export default nextConfig;
