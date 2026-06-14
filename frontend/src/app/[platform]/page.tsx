import DownloaderUI from "@/components/DownloaderUI";
import { Metadata } from "next";
import { notFound } from "next/navigation";

// Define supported platforms and their specific SEO content
const PLATFORM_SEO: Record<string, { title: string; desc: string; h1: React.ReactNode }> = {
  tiktok: {
    title: "Download Video TikTok Tanpa Watermark (HD) - NEXA Downloader",
    desc: "Situs download video TikTok tanpa watermark gratis. Unduh video TikTok kualitas HD, cepat, dan tanpa batas di NEXA Downloader.",
    h1: <>TikTok <span className="text-blue-600">Downloader</span></>,
  },
  youtube: {
    title: "YouTube Downloader MP4 & MP3 Gratis - NEXA Downloader",
    desc: "Download video YouTube ke MP4 dan convert ke MP3 secara gratis. Unduh video YouTube kualitas 1080p, 4K, cepat dan mudah.",
    h1: <>YouTube <span className="text-red-600">Downloader</span></>,
  },
  instagram: {
    title: "Instagram Downloader: Download Video, Reels, Foto IG",
    desc: "Download video Instagram, Reels, IGTV, dan foto Carousel dengan mudah. NEXA Downloader adalah pengunduh Instagram terbaik.",
    h1: <>Instagram <span className="text-pink-600">Downloader</span></>,
  },
  twitter: {
    title: "Twitter (X) Video Downloader - Unduh Video Twitter",
    desc: "Download video dari Twitter (X) kualitas HD. Simpan video dan GIF dari Twitter ke galeri Anda secara gratis dan cepat.",
    h1: <>Twitter <span className="text-slate-800">Downloader</span></>,
  },
  facebook: {
    title: "Facebook Video Downloader - Download Video FB HD",
    desc: "Download video Facebook ke galeri dengan mudah. Unduh video FB kualitas tinggi gratis tanpa aplikasi tambahan.",
    h1: <>Facebook <span className="text-blue-700">Downloader</span></>,
  },
  pinterest: {
    title: "Pinterest Video & Image Downloader",
    desc: "Download video dan gambar dari Pinterest secara gratis dengan NEXA Downloader. Kualitas tinggi dan tanpa batas.",
    h1: <>Pinterest <span className="text-red-500">Downloader</span></>,
  },
  bstation: {
    title: "Bstation / Bilibili Video Downloader",
    desc: "Download video Bstation atau Bilibili dengan resolusi tinggi. Alat unduh video Bstation gratis dan cepat.",
    h1: <>Bstation <span className="text-cyan-500">Downloader</span></>,
  },
};

export function generateStaticParams() {
  return Object.keys(PLATFORM_SEO).map((platform) => ({
    platform: platform,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ platform: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const platformData = PLATFORM_SEO[resolvedParams.platform.toLowerCase()];
  
  if (!platformData) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: platformData.title,
    description: platformData.desc,
    alternates: {
      canonical: `/${resolvedParams.platform}`,
    },
    openGraph: {
      title: platformData.title,
      description: platformData.desc,
      url: `https://nexalabs.my.id/${resolvedParams.platform}`,
    }
  };
}

export default async function PlatformPage({ params }: { params: Promise<{ platform: string }> }) {
  const resolvedParams = await params;
  const platform = resolvedParams.platform.toLowerCase();
  const platformData = PLATFORM_SEO[platform];

  if (!platformData) {
    notFound();
  }

  return (
    <DownloaderUI 
      platformName={platform} 
      seoH1={platformData.h1} 
      seoDescription={platformData.desc} 
    />
  );
}
