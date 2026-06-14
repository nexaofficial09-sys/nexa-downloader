import DownloaderUI from "@/components/DownloaderUI";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NEXA Downloader — Download Video TikTok, YouTube, IG Tanpa Watermark",
  description:
    "Situs download video TikTok tanpa watermark, YouTube MP4/MP3, Instagram Reels, Facebook, dan Twitter/X gratis dengan kualitas HD. Proses cepat dan tanpa batas.",
};

export default function HomePage() {
  return <DownloaderUI />;
}
