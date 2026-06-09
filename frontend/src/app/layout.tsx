import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEXA Downloader — Download Videos, Audio & Images",
  description:
    "Download high-quality videos, audio, and image carousels from YouTube, TikTok, Instagram, Twitter/X, and Facebook. Fast, free, no registration.",
  keywords: [
    "video downloader", "tiktok downloader", "youtube downloader",
    "instagram downloader", "media downloader",
  ],
  authors: [{ name: "NEXA" }],
  openGraph: {
    title: "NEXA Downloader",
    description: "Download videos from any platform instantly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
