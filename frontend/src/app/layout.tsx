import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEXA Downloader — Download Video dari Semua Platform",
  description:
    "Download high-quality videos, audio, and image carousels from YouTube, TikTok, Instagram, Twitter/X, and Facebook. Fast, free, no registration.",
  keywords: [
    "video downloader", "tiktok downloader", "youtube downloader",
    "instagram downloader", "media downloader", "download video gratis",
    "download tiktok tanpa watermark", "unduh video youtube",
  ],
  authors: [{ name: "NEXA" }],
  metadataBase: new URL("https://dl.nexalabs.my.id"),
  openGraph: {
    title: "NEXA Downloader — Download Video dari Semua Platform",
    description: "Download video, audio, dan foto dari YouTube, TikTok, Instagram, Twitter/X, dan Facebook. Gratis, cepat, tanpa registrasi.",
    type: "website",
    siteName: "NEXA Downloader",
    url: "https://dl.nexalabs.my.id",
    images: [
      {
        url: "/logo.png",
        width: 1024,
        height: 1023,
        alt: "NEXA Downloader Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXA Downloader — Download Video dari Semua Platform",
    description: "Download video, audio, dan foto dari YouTube, TikTok, Instagram, Twitter/X, dan Facebook. Gratis, cepat, tanpa registrasi.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9737044242758389" crossOrigin="anonymous"></script>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
