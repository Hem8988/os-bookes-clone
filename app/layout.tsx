import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NoAutofill } from "@/components/NoAutofill";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pramukh Indane — Indane LPG Distributor",
  description: "Pramukh Indane — commercial and domestic Indane LPG cylinders, orders, deliveries and accounts.",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Pramukh Indane", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NoAutofill />
        {children}
      </body>
    </html>
  );
}
