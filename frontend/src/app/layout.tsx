import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEXA Downloader — Download Video TikTok, YouTube, IG Tanpa Watermark",
  description:
    "Situs download video TikTok tanpa watermark, YouTube MP4/MP3, Instagram Reels, Facebook, dan Twitter/X gratis dengan kualitas HD. Proses cepat dan tanpa batas.",
  keywords: [
    "download video tiktok", "tiktok downloader tanpa watermark", "youtube downloader mp4",
    "download mp3 youtube", "download reels instagram", "facebook video downloader",
    "twitter video downloader", "download video hd", "ssstik", "savefrom", "nexa downloader"
  ],
  authors: [{ name: "NEXA" }],
  metadataBase: new URL("https://nexalabs.my.id"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NEXA Downloader — Download Video & Audio Gratis",
    description: "Download video dari TikTok tanpa watermark, YouTube, IG, FB, dan Twitter dengan kualitas HD. 100% gratis, super cepat, tanpa perlu aplikasi tambahan.",
    type: "website",
    siteName: "NEXA Downloader",
    url: "https://nexalabs.my.id",
    images: [
      {
        url: "/LogoJadi.png",
        width: 1200,
        height: 630,
        alt: "NEXA Downloader",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXA Downloader — Download Video & Audio Gratis",
    description: "Download video dari TikTok tanpa watermark, YouTube, IG, FB, dan Twitter dengan kualitas HD. 100% gratis dan super cepat.",
    images: ["/LogoJadi.png"],
  },
  icons: {
    icon: "/logo1.png",
    shortcut: "/logo1.png",
    apple: "/logo1.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9737044242758389" crossOrigin="anonymous"></script>
        <script src="https://pl29709267.effectivecpmnetwork.com/16/dc/c4/16dcc4149d8ea5316f20076370262bec.js" async></script>
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        
        {/* Floating Saweria Donation Button */}
        <a 
          href="https://saweria.co/NEXAOfficial" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-[#ffb72b] hover:bg-[#e09e1e] text-amber-950 font-bold px-5 py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 border-white/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 group"
          aria-label="Donasi Saweria"
        >
          <span className="text-2xl group-hover:animate-bounce">☕</span>
          <span className="hidden sm:inline tracking-wide">Traktir Kopi</span>
        </a>
      </body>
    </html>
  );
}
