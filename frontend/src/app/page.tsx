"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Format {
  format_id: string;
  url: string;
  ext: string;
  resolution: string;
  filesize_label: string;
  vcodec: string;
  acodec: string;
  needs_merge: boolean;
  is_premium?: boolean;
  is_best?: boolean;
}
interface FormatGroup {
  video_audio: Format[];
  video_only: Format[];
  audio_only: Format[];
}
interface ExtractedImage {
  id: string;
  url: string;
  ext: string;
}
interface ExtractedSubtitle {
  language: string;
  url: string;
  ext: string;
  is_auto: boolean;
}
interface ExtractResult {
  success: boolean;
  title: string;
  thumbnail: string;
  duration?: number | null;
  platform: string;
  original_url: string;
  needs_proxy: boolean;
  is_image_only: boolean;
  formats: FormatGroup;
  images: ExtractedImage[];
  subtitles?: ExtractedSubtitle[];
}


const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    }
  }
};

import type { Variants } from "framer-motion";

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 250, damping: 25 } }
};

const FadeInView = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <motion.div
    variants={staggerContainer}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-50px" }}
    className={className}
  >
    {children}
  </motion.div>
);

const API_BASE =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://api.nexalabs.my.id";

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------
type Language = "id" | "en";
const translations = {
  id: {
    heroTitle: "Pengunduh ",
    heroSub: "Multi-Platform",
    heroDesc:
      "Ekstrak video resolusi tinggi, audio jernih, dan Slide Foto (Carousel) dengan mudah. Sistem telah di-upgrade dengan Bypass Anti-Bot terbaru untuk hasil yang lebih maksimal.",
    pasteLabel: "Tempelkan tautan media sosial di sini...",
    btnExtract: "Ekstrak",
    btnExtracting: "Memproses...",
    featuresTitle: "Kenapa Memilih NEXA Downloader?",
    navDownloader: "Pengunduh",
    navPlatforms: "Platform yang Didukung",
    tabVideoAudio: "Video + Audio",
    tabVideoOnly: "Hanya Video",
    tabAudioOnly: "Hanya Audio",
    tabImages: "Gambar",
    tabSubtitles: "Takarir (Subtitles)",
    btnDownload: "Unduh",
    btnMerge: "Gabungkan",
    proxyBypass: "NEXA Server Proxy (Bypass)",
    footerText: "Dibuat dengan ❤️ oleh NEXA Downloader",
    feat1Title: "100% Gratis Selamanya",
    feat1Desc:
      "Tanpa biaya langganan, tanpa batasan jumlah unduhan. Bebas digunakan kapan saja.",
    feat2Title: "Kecepatan Unduh Maksimal",
    feat2Desc:
      "Server kami dioptimalkan untuk mengekstrak dan mengunduh media dengan kecepatan tinggi.",
    feat3Title: "Mendukung Resolusi 4K",
    feat3Desc:
      "Unduh video dengan kualitas terbaik hingga 4K atau audio jernih (320kbps).",
    feat4Title: "Aman & Bebas Iklan Mengganggu",
    feat4Desc:
      "Platform bersih tanpa popup berbahaya atau iklan yang menutupi konten utama.",
    platYtTitle: "Pengunduh YouTube",
    platYtDesc:
      "NEXA mendukung unduhan video MP4, audio MP3, dan YouTube Shorts dengan resolusi tinggi tanpa batasan.",
    platTtTitle: "TikTok Tanpa Watermark",
    platTtDesc:
      "Unduh video TikTok favorit Anda tanpa logo/watermark dengan proses ekstraksi super cepat.",
    platIgTitle: "Unduhan Instagram",
    platIgDesc:
      "Simpan gambar Carousel (multi-slide), Reels, IGTV, dan Postingan Foto dengan sekali klik.",
    platTwTitle: "Twitter / X",
    platTwDesc:
      "Simpan video viral, klip pendek, maupun gambar dari lini masa Twitter (X) langsung ke perangkat Anda.",
    platFbTitle: "Video Facebook",
    platFbDesc:
      "Unduh berbagai format video dari grup publik, halaman komunitas, maupun profil personal di Facebook.",
    platPinTitle: "Pinterest Downloader",
    platPinDesc:
      "Unduh gambar, carousel, maupun video pin dari Pinterest dengan kualitas tinggi tanpa login.",
    platBsTitle: "Bstation / Bilibili",
    platBsDesc:
      "Unduh video dan anime favorit dari Bstation atau Bilibili dengan resolusi tinggi (1080p/4K) secara gratis.",
    howToTitle: "Cara Menggunakan NEXA",
    howTo1Title: "Salin Tautan",
    howTo1Desc:
      "Salin tautan video, musik, atau postingan foto yang ingin Anda unduh.",
    howTo2Title: "Tempel Tautan",
    howTo2Desc:
      "Tempelkan tautan tersebut pada kolom pencarian di atas, sistem akan memprosesnya otomatis.",
    howTo3Title: "Pilih & Unduh",
    howTo3Desc:
      "Pilih format atau resolusi yang tersedia, lalu klik tombol Simpan atau Unduh.",
    faqTitle: "Pertanyaan yang Sering Diajukan",
    faq1Q: "Apakah NEXA Downloader gratis?",
    faq1A: "Ya, layanan kami sepenuhnya gratis tanpa perlu registrasi.",
    faq2Q: "Di mana file saya disimpan?",
    faq2A:
      "File akan otomatis tersimpan di folder 'Downloads' pada perangkat Anda.",
    faq3Q: "Apakah aman digunakan?",
    faq3A:
      "Sangat aman. Kami tidak menyimpan riwayat unduhan Anda di server kami.",
    featSectionTitle: "Keuntungan Menggunakan Kami",
    modalHide: "Sembunyikan",
    modalDone: "Selesai!",
    modalWarning:
      "Harap JANGAN MENUTUP halaman ini. Unduhan otomatis dimulai saat mencapai 100%.",
    modalErr: "Terjadi Kesalahan",
    modalPrep: "Menyiapkan File...",
    contactHelpCenter: "Pusat Bantuan & Laporan",
    contactTitle: "Hubungi Kami",
    contactDesc:
      "Punya kendala saat mengunduh? Hubungi admin NEXA secara langsung melalui opsi di bawah ini.",
    contactWa: "Chat via WhatsApp",
    contactEmail: "Atau via Email",
    contactEmailLabel: "Email Anda",
    contactMsgLabel: "Kendala / Pesan",
    contactSendBtn: "Kirim Pesan",
    contactSuccess: "Pesan Terkirim!",
    contactSuccessDesc:
      "Terima kasih atas laporan Anda. Admin kami akan segera mengeceknya.",
    contactSendAnother: "Kirim pesan lain",
    modalAudioTitle: "Mengunduh Audio...",
    modalVideoTitle: "Mengunduh Video...",
    modalSubTitle: "Mengunduh Subtitle...",
    modalConvMp3: "Mengonversi ke MP3...",
    modalMerge: "Menggabungkan Video & Audio...",
    modalFinished: "Selesai",
    toastCopyOk: "Tautan berhasil disalin ke papan klip!",
    toastCopyFail: "Gagal menyalin tautan!",
    errorExtractMsg: "Terjadi kesalahan saat memproses tautan.",
    modalServerDl: "Mengunduh ke Server...",
    modalClose: "Tutup",
    modalReady: "File Anda sudah siap dan sedang diunduh oleh browser.",
    modalErrorText:
      "Gagal memproses video ini di server. Silakan coba kualitas lain.",
    modalCached:
      "File sudah di-cache oleh server. Mempersiapkan unduhan Anda...",
    modalWarning1: "Harap",
    modalWarning2: "JANGAN MENUTUP",
    modalWarning3: "halaman ini. Unduhan otomatis dimulai saat mencapai 100%.",
    platSectionTitle: "Pengunduh Multi-Platform",
    footerPrivacy: "Kebijakan Privasi",
    footerTerms: "Syarat & Ketentuan",
    adBannerSponsor: "Ruang Iklan Sponsor",
    adBannerTitle: "Pasang Iklan Anda di Sini",
    adBannerDesc:
      "Jangkau ribuan pengguna NEXA Downloader setiap harinya. Hubungi admin untuk detail pemasangan.",
    contactEmailPlaceholder: "nama@email.com",
    contactMsgPlaceholder: "Ceritakan kendala yang Anda alami...",
    footerRights: "© 2026 NEXA Downloader. All rights reserved.",
  },
  en: {
    heroTitle: "Universal ",
    heroSub: "Downloader",
    heroDesc:
      "Extract high-resolution videos, crystal-clear audio, and Photo Carousels effortlessly. Upgraded with the latest Anti-Bot Bypass for maximum performance.",
    pasteLabel: "Paste a social media link here...",
    btnExtract: "Extract",
    btnExtracting: "Processing...",
    featuresTitle: "Why Choose NEXA Downloader?",
    navDownloader: "Downloader",
    navPlatforms: "Supported Platforms",
    tabVideoAudio: "Video + Audio",
    tabVideoOnly: "Video Only",
    tabAudioOnly: "Audio Only",
    tabImages: "Images",
    tabSubtitles: "Subtitles",
    btnDownload: "Download",
    btnMerge: "Merge",
    proxyBypass: "NEXA Server Proxy (Bypass)",
    footerText: "Made with ❤️ by NEXA Downloader",
    feat1Title: "100% Free Forever",
    feat1Desc: "No subscription fees, no download limits. Free to use anytime.",
    feat2Title: "Maximum Download Speed",
    feat2Desc:
      "Our servers are optimized to extract and download media at high speeds.",
    feat3Title: "Supports 4K Resolution",
    feat3Desc:
      "Download videos in top quality up to 4K or crystal-clear audio (320kbps).",
    feat4Title: "Safe & Free from Annoying Ads",
    feat4Desc:
      "Clean platform without harmful popups or ads that cover the main content.",
    platYtTitle: "YouTube Downloader",
    platYtDesc:
      "NEXA supports MP4 video, MP3 audio, and YouTube Shorts downloads in high resolution without limits.",
    platTtTitle: "TikTok Without Watermark",
    platTtDesc:
      "Download your favorite TikTok videos without watermarks using our super-fast extraction process.",
    platIgTitle: "Instagram Downloader",
    platIgDesc:
      "Save Carousel images (multi-slide), Reels, IGTV, and Photo Posts with a single click.",
    platTwTitle: "Twitter / X",
    platTwDesc:
      "Save viral videos, short clips, or images from your Twitter (X) timeline directly to your device.",
    platFbTitle: "Facebook Video",
    platFbDesc:
      "Download various video formats from public groups, community pages, or personal profiles on Facebook.",
    platPinTitle: "Pinterest Downloader",
    platPinDesc:
      "Download high-quality images, carousels, or video pins directly from Pinterest without logging in.",
    platBsTitle: "Bstation / Bilibili",
    platBsDesc:
      "Download your favorite videos and anime from Bstation or Bilibili in high resolution (1080p/4K) for free.",
    howToTitle: "How to Use NEXA",
    howTo1Title: "Copy Link",
    howTo1Desc:
      "Copy the link of the video, music, or photo post you want to download.",
    howTo2Title: "Paste Link",
    howTo2Desc:
      "Paste the link into the search box above, the system will process it automatically.",
    howTo3Title: "Select & Download",
    howTo3Desc:
      "Select the available format or resolution, then click the Save or Download button.",
    faqTitle: "Frequently Asked Questions",
    faq1Q: "Is NEXA Downloader free?",
    faq1A: "Yes, our service is completely free without needing to register.",
    faq2Q: "Where are my files saved?",
    faq2A:
      "Files will be automatically saved in the 'Downloads' folder on your device.",
    faq3Q: "Is it safe to use?",
    faq3A: "Very safe. We do not store your download history on our servers.",
    featSectionTitle: "Why Choose Us",
    modalHide: "Hide",
    modalDone: "Done!",
    modalWarning:
      "Please DO NOT CLOSE this page. Download starts automatically at 100%.",
    modalErr: "An Error Occurred",
    modalPrep: "Preparing File...",
    contactHelpCenter: "Help Center & Reports",
    contactTitle: "Contact Us",
    contactDesc:
      "Having trouble downloading? Contact NEXA admin directly through the options below.",
    contactWa: "Chat via WhatsApp",
    contactEmail: "Or via Email",
    contactEmailLabel: "Your Email",
    contactMsgLabel: "Issue / Message",
    contactSendBtn: "Send Message",
    contactSuccess: "Message Sent!",
    contactSuccessDesc:
      "Thank you for your report. Our admin will check it shortly.",
    contactSendAnother: "Send another message",
    modalAudioTitle: "Downloading Audio...",
    modalVideoTitle: "Downloading Video...",
    modalSubTitle: "Downloading Subtitle...",
    modalConvMp3: "Converting to MP3...",
    modalMerge: "Merging Video & Audio...",
    modalFinished: "Finished",
    toastCopyOk: "Link copied to clipboard!",
    toastCopyFail: "Failed to copy link!",
    errorExtractMsg: "An error occurred while processing the link.",
    modalServerDl: "Downloading to Server...",
    modalClose: "Close",
    modalReady: "Your file is ready and is being downloaded by your browser.",
    modalErrorText:
      "Failed to process this video on the server. Please try another quality.",
    modalCached:
      "File is already cached by the server. Preparing your download...",
    modalWarning1: "Please",
    modalWarning2: "DO NOT CLOSE",
    modalWarning3: "this page. Download starts automatically at 100%.",
    platSectionTitle: "Multi-Platform Downloader",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms & Conditions",
    adBannerSponsor: "SPONSORED AD SPACE",
    adBannerTitle: "Advertise Here",
    adBannerDesc:
      "Reach thousands of NEXA Downloader users daily. Contact admin for advertising details.",
    contactEmailPlaceholder: "name@email.com",
    contactMsgPlaceholder: "Describe the issue you're experiencing...",
    footerRights: "© 2026 NEXA Downloader. All rights reserved.",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDuration(seconds?: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function sanitizeFilename(t: string): string {
  return (
    t
      .replace(/[^\w\s\-\.]/g, "")
      .trim()
      .slice(0, 80) || "media"
  );
}

function buildDownloadUrl(
  f: Format,
  title: string,
  platform: string,
  proxy: boolean,
  origUrl: string,
): string {
  const fname = `${sanitizeFilename(title)}_${f.resolution || f.format_id}.${f.ext}`;
  if (f.needs_merge)
    return `${API_BASE}/api/merge?url=${encodeURIComponent(origUrl)}&format_id=${encodeURIComponent(f.format_id)}&filename=${encodeURIComponent(fname)}`;
  if (proxy)
    return `${API_BASE}/api/proxy?url=${encodeURIComponent(f.url)}&filename=${encodeURIComponent(fname)}&platform=${encodeURIComponent(platform)}&is_image=false`;
  return f.url;
}

function buildImageUrl(
  url: string,
  title: string,
  idx: number,
  proxy: boolean,
  platform: string,
  preview = true,
  crop_portrait = false,
): string {
  const fname = `${sanitizeFilename(title)}_img${idx}.jpg`;
  // Always proxy if we want to force a download (!preview), so the browser can download it natively
  if (proxy || !preview || crop_portrait) {
    let proxyUrl = `${API_BASE}/api/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(fname)}&platform=${encodeURIComponent(platform)}&is_image=true&preview=${preview}`;
    if (crop_portrait) proxyUrl += "&crop_portrait=true";
    return proxyUrl;
  }
  return url;
}

// Platform configs
const PLATFORMS = [
  {
    name: "YouTube",
    badge: "badge-youtube",
    icon: (
      <svg
        className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#FF0000]"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    badge: "badge-tiktok",
    icon: (
      <svg
        className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-900"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    badge: "badge-instagram",
    icon: (
      <svg
        className="w-3.5 h-3.5 lg:w-4 lg:h-4"
        fill="url(#ig-grad-badge)"
        viewBox="0 0 24 24"
      >
        <defs>
          <linearGradient id="ig-grad-badge" x1="2" y1="22" x2="22" y2="2">
            <stop offset="0%" stopColor="#feda75" />
            <stop offset="25%" stopColor="#fa7e1e" />
            <stop offset="50%" stopColor="#d62976" />
            <stop offset="75%" stopColor="#962fbf" />
            <stop offset="100%" stopColor="#4f5bd5" />
          </linearGradient>
        </defs>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    name: "Twitter/X",
    badge: "badge-twitter",
    icon: (
      <svg
        className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-900"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    badge: "badge-facebook",
    icon: (
      <svg
        className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#1877F2]"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Pinterest",
    badge: "badge-pinterest",
    icon: (
      <svg
        className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#E60023]"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.182 0 7.436 2.983 7.436 6.953 0 4.156-2.618 7.502-6.257 7.502-1.22 0-2.368-.635-2.76-1.385l-.754 2.875c-.272 1.039-1.015 2.34-1.51 3.136 1.43.441 2.955.679 4.536.679 6.621 0 11.988-5.368 11.988-11.988 0-6.62-5.367-11.987-11.988-11.987z" />
      </svg>
    ),
  },
  {
    name: "Bstation",
    badge: "badge-bstation",
    icon: (
      <svg
        className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#00A1D6]"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.72c.267-.249.573-.373.92-.373.347 0 .662.124.947.373.284.249.426.551.426.907s-.142.65-.426.906l-1.174 1.12zM5.333 7.24c-.746.018-1.373.276-1.88.774-.506.497-.764 1.124-.773 1.88v7.36c.009.755.267 1.382.773 1.88.507.498 1.134.755 1.88.773h13.334c.746-.018 1.373-.275 1.88-.773.506-.498.764-1.125.773-1.88v-7.36c-.009-.756-.267-1.383-.773-1.88-.507-.498-1.134-.756-1.88-.774H5.333zM7.067 10.653c.409 0 .755.142 1.04.427.284.284.426.63.426 1.04v1.813c0 .409-.142.756-.426 1.04-.285.285-.631.427-1.04.427-.409 0-.756-.142-1.04-.427-.285-.284-.427-.631-.427-1.04v-1.813c0-.409.142-.756.427-1.04.284-.285.631-.427 1.04-.427zm10.133 0c.409 0 .756.142 1.04.427.285.284.427.63.427 1.04v1.813c0 .409-.142.756-.427 1.04-.284.285-.631.427-1.04.427-.409 0-.756-.142-1.04-.427-.285-.284-.427-.631-.427-1.04v-1.813c0-.409.142-.756.427-1.04.284-.285.631-.427 1.04-.427z" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

interface HistoryItem {
  id: string;
  title: string;
  thumbnail: string;
  platform: string;
  timestamp: number;
  original_url: string;
}

export function AdBanner({
  className = "",
  adKey,
  t,
}: {
  className?: string;
  adKey?: string;
  t?: any;
}) {
  const [windowWidth, setWindowWidth] = useState(728);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize(); // Check on initial client render
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const keyToUse = adKey || "da47afc2cfbfe8096db5364e18c803a5";
  const adWidth = 728;
  const adHeight = 90;
  
  // Calculate scale to fit screen, with a bit of padding (e.g. 32px for safe area)
  const availableWidth = mounted ? Math.min(windowWidth - 32, adWidth) : adWidth;
  const scale = availableWidth / adWidth;
  const scaledHeight = adHeight * scale;

  return (
    <div
      className={`w-full max-w-[728px] mx-auto my-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center text-center overflow-hidden relative ${className}`}
      style={{ minHeight: mounted ? scaledHeight + 30 : adHeight + 30 }}
    >
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-2 z-10">
        {t?.adBannerSponsor || "Advertisement"}
      </span>
      {/* Optional shimmering effect while loading */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_2s_infinite] -skew-x-12 pointer-events-none"></div>
      
      <div 
        className="flex justify-center items-start overflow-hidden relative z-20" 
        style={{ width: availableWidth, height: scaledHeight }}
      >
        {mounted ? (
          <iframe
            src={`/ad_bottom.html?key=${keyToUse}`}
            width={adWidth}
            height={adHeight}
            frameBorder="0"
            scrolling="no"
            style={{ 
              border: "none", 
              transform: `scale(${scale})`, 
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0
            }}
          ></iframe>
        ) : (
          <div className="animate-pulse bg-slate-200 rounded" style={{ width: availableWidth, height: scaledHeight }}></div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE === "true";

  if (
    isMaintenance &&
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost"
  ) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-700 font-sans flex items-center justify-center p-6 relative overflow-hidden">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Under Maintenance
          </h1>
          <p className="text-slate-500 leading-relaxed mb-6">
            NEXA Downloader sedang dalam peningkatan sistem untuk melayani Anda
            lebih baik. Kami akan segera kembali!
          </p>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-1/3 animate-[pulse_2s_ease-in-out_infinite] rounded-full"></div>
          </div>
        </div>
      </main>
    );
  }

  const [lang, setLang] = useState<Language>("id");

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Language;
    if (savedLang === "id" || savedLang === "en") {
      setLang(savedLang);
    }
  }, []);

  const t = translations[lang];
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [activeTab, setActiveTab] = useState<
    "video_audio" | "video_only" | "audio_only" | "images" | "subtitles"
  >("video_audio");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(
    null,
  );

  const handleImageDownload = async (
    url: string,
    filename: string,
    id: string,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    if (downloadingImageId) return;
    setDownloadingImageId(id);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(
        "Failed to download image via fetch, falling back to new tab",
        err,
      );
      window.open(url, "_blank");
    } finally {
      setDownloadingImageId(null);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("nexa_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const addToHistory = (res: ExtractResult) => {
    setHistory((prev) => {
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        title: res.title,
        thumbnail: res.thumbnail || "",
        platform: res.platform || "unknown",
        timestamp: Date.now(),
        original_url: res.original_url,
      };
      const filtered = prev.filter((h) => h.original_url !== res.original_url);
      const updated = [newItem, ...filtered].slice(0, 15);
      localStorage.setItem("nexa_history", JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("nexa_history");
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      localStorage.setItem("nexa_history", JSON.stringify(updated));
      return updated;
    });
  };

  // Custom alerts/modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactFormStatus, setContactFormStatus] = useState<
    "idle" | "sending" | "success"
  >("idle");
  const [mergeAlert, setMergeAlert] = useState<{
    show: boolean;
    filename: string;
    taskId: string;
    percent: number;
    status: string;
  }>({ show: false, filename: "", taskId: "", percent: 0, status: "" });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      mergeAlert.show &&
      (mergeAlert.status === "downloading" || mergeAlert.status === "merging")
    ) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(
            `${API_BASE}/api/progress?task_id=${mergeAlert.taskId}`,
          );
          const data = await res.json();
          if (data.status) {
            setMergeAlert((prev) => ({
              ...prev,
              percent: data.percent || 0,
              status: data.status,
            }));

            if (data.status === "done") {
              clearInterval(interval);
              // Trigger actual file download via hidden a tag
              const dlUrl = `${API_BASE}/api/serve-file?task_id=${mergeAlert.taskId}&filename=${encodeURIComponent(mergeAlert.filename)}`;
              const a = document.createElement("a");
              a.href = dlUrl;
              a.download = mergeAlert.filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          }
        } catch (err) {
          // ignore network errors, keep polling
        }
      }, 1000);
    }

    // Fake animation logic for cached files
    if (mergeAlert.show && mergeAlert.status === "fake_animating") {
      interval = setInterval(() => {
        setMergeAlert((prev) => {
          const nextPercent = prev.percent + 20; // 5 steps
          if (nextPercent >= 100) {
            clearInterval(interval);

            // Trigger actual file download
            setTimeout(() => {
              const dlUrl = `${API_BASE}/api/serve-file?task_id=${prev.taskId}&filename=${encodeURIComponent(prev.filename)}`;
              const a = document.createElement("a");
              a.href = dlUrl;
              a.download = ""; // Let the browser use Content-Disposition from the server
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setMergeAlert((p) => ({ ...p, status: "done", percent: 100 }));
            }, 400); // slight delay at 100% before showing t.modalDone

            return { ...prev, percent: 100 };
          }
          return { ...prev, percent: nextPercent };
        });
      }, 150);
      return () => clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [mergeAlert]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/download?url=${encodeURIComponent(url.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to extract.");
      setResult(data);
      // History disabled
      if (
        data.is_image_only ||
        (data.images?.length > 0 && data.formats.video_audio.length === 0)
      ) {
        setActiveTab("images");
      } else {
        setActiveTab("video_audio");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Format cards
  // -----------------------------------------------------------------------
  const renderFormatGrid = (formats: Format[]) => {
    if (formats.length === 0) {
      return (
        <div className="py-12 lg:py-16 text-center fade-in-up">
          <svg
            className="w-8 h-8 lg:w-10 lg:h-10 mx-auto mb-3 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs lg:text-sm text-slate-400">
            No formats available in this category.
          </p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4 fade-in-up">
        {formats.map((fmt, idx) => {
          const isBest = fmt.is_best;
          const isPremium = fmt.is_premium;
          return (
            <div
              key={idx}
              className={`format-card relative overflow-hidden rounded-xl lg:rounded-2xl border p-4 lg:p-5 ${
                isBest
                  ? "bg-blue-50 border-blue-200"
                  : isPremium
                    ? "bg-amber-50 border-amber-200"
                    : "bg-white border-slate-200"
              }`}
            >
              {isBest && (
                <div className="absolute top-0 right-0 px-2.5 py-1 bg-blue-500 text-[10px] font-bold text-white rounded-bl-xl tracking-wider">
                  ★ BEST
                </div>
              )}
              {isPremium && !isBest && (
                <div className="absolute top-0 right-0 px-2.5 py-1 bg-amber-500 text-[10px] font-bold text-white rounded-bl-xl tracking-wider">
                  HIGH RES
                </div>
              )}
              <div className="flex justify-between items-center mb-2 lg:mb-3">
                <span className="text-lg lg:text-2xl font-black tracking-tight text-slate-900">
                  {fmt.resolution || "Audio"}
                </span>
                {fmt.filesize_label && (
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    {fmt.filesize_label}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mb-3 lg:mb-5">
                <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 rounded-md px-2 py-0.5 tracking-wider">
                  {fmt.ext}
                </span>
                {fmt.needs_merge && (
                  <span
                    className={`text-[10px] uppercase font-bold rounded-md px-2 py-0.5 flex items-center gap-1 tracking-wider border ${fmt.ext === "mp3" ? "text-green-600 bg-green-50 border-green-200" : "text-blue-600 bg-blue-50 border-blue-200"}`}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          fmt.ext === "mp3"
                            ? "M9 19V6l12-3v13M9 19c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm12-3c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM9 10l12-3"
                            : "M13 10V3L4 14h7v7l9-11h-7z"
                        }
                      />
                    </svg>
                    {fmt.ext === "mp3" ? "Convert" : "Merge"}
                  </span>
                )}
              </div>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  setMergeAlert({
                    show: true,
                    filename: `${sanitizeFilename(result!.title)}_${fmt.resolution || fmt.format_id}.${fmt.ext}`,
                    taskId: "",
                    percent: 0,
                    status: "starting",
                  });
                  try {
                    const extraParams =
                      !fmt.needs_merge && fmt.url
                        ? `&direct_url=${encodeURIComponent(fmt.url)}&ext=${encodeURIComponent(fmt.ext)}`
                        : `&ext=${encodeURIComponent(fmt.ext)}`;
                    const startUrl = `${API_BASE}/api/start-merge?url=${encodeURIComponent(result!.original_url)}&format_id=${encodeURIComponent(fmt.format_id)}${extraParams}`;
                    const res = await fetch(startUrl);
                    const data = await res.json();
                    if (data.task_id) {
                      if (data.status === "done") {
                        setMergeAlert((prev) => ({
                          ...prev,
                          taskId: data.task_id,
                          status: "fake_animating",
                          percent: 0,
                        }));
                      } else {
                        setMergeAlert((prev) => ({
                          ...prev,
                          taskId: data.task_id,
                          status: data.status,
                        }));
                      }
                    } else {
                      setMergeAlert((prev) => ({ ...prev, status: "error" }));
                    }
                  } catch (err) {
                    setMergeAlert((prev) => ({ ...prev, status: "error" }));
                  }
                }}
                className={`w-full py-2.5 lg:py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${
                  isBest
                    ? "btn-primary"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {t.btnDownload}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Image gallery
  // -----------------------------------------------------------------------
  const renderImages = () => {
    if (!result?.images || result.images.length === 0) {
      return (
        <div className="py-12 lg:py-16 text-center fade-in-up">
          <svg
            className="w-8 h-8 lg:w-10 lg:h-10 mx-auto mb-3 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          <p className="text-xs lg:text-sm text-slate-500">
            No images available.
          </p>
        </div>
      );
    }
    return (
      // Mobile: 2 cols, Tablet: 3 cols, Desktop: 4 cols
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 lg:gap-4 fade-in-up">
        {result.images
          .filter((img) => img.url && img.url.trim() !== "")
          .map((img, idx) => {
            const isYtShort =
              result.platform?.toLowerCase() === "youtube" &&
              result.original_url?.includes("/shorts/");
            const imgUrl = buildImageUrl(
              img.url,
              result.title,
              idx + 1,
              result.needs_proxy,
              result.platform,
              true,
              isYtShort, // crop_portrait for preview
            );
            const downloadUrl = buildImageUrl(
              img.url,
              result.title,
              idx + 1,
              result.needs_proxy,
              result.platform,
              false,
              isYtShort, // crop_portrait for download
            );
            return (
              <div
                key={img.id || idx}
                className="group relative rounded-xl lg:rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-blue-300 transition-all duration-300 break-inside-avoid"
              >
                <img
                  src={imgUrl}
                  alt={`Slide ${idx + 1}`}
                  className={`w-full block transition-transform duration-700 group-hover:scale-[1.02] ${isYtShort ? "aspect-[9/16] object-cover" : "aspect-square object-cover"}`}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.failed) {
                      target.dataset.failed = "true";
                      target.src = img.url;
                    } else {
                      target.src = "/logo.png"; // Ultimate fallback
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-2 lg:p-3 translate-y-0 lg:translate-y-3 lg:group-hover:translate-y-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                  <button
                    onClick={(e) =>
                      handleImageDownload(
                        downloadUrl,
                        `${sanitizeFilename(result.title)}_img${idx + 1}.jpg`,
                        img.id,
                        e,
                      )
                    }
                    disabled={downloadingImageId === img.id}
                    className="w-full py-2 bg-blue-500 text-white text-[11px] lg:text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-600 transition-colors shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {downloadingImageId === img.id ? (
                      <>
                        <svg
                          className="animate-spin h-3.5 w-3.5 text-blue-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Save
                      </>
                    )}
                  </button>
                </div>
                <div className="absolute top-1.5 right-1.5 lg:top-2 lg:right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[9px] lg:text-[10px] font-bold">
                  {idx + 1}/{result.images.length}
                </div>
              </div>
            );
          })}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Subtitles
  // -----------------------------------------------------------------------
  const renderSubtitles = () => {
    if (!result?.subtitles || result.subtitles.length === 0) {
      return (
        <div className="py-12 lg:py-16 text-center fade-in-up">
          <svg
            className="w-8 h-8 lg:w-10 lg:h-10 mx-auto mb-3 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.36 5.47.411.397.64.95.64 1.53v1.5H9c.58 0 1.133-.23 1.53-.64.938-.96 2.22-1.5 3.47-1.5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8.25 10.5h7.5m-7.5 3h4.5"
            />
          </svg>
          <p className="text-xs lg:text-sm text-slate-500">
            No subtitles available.
          </p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 fade-in-up">
        {result.subtitles.map((sub, idx) => (
          <div
            key={idx}
            className="group relative bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl lg:rounded-2xl p-4 lg:p-5 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-xs lg:text-sm font-bold">
                    {sub.ext.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm lg:text-base font-bold text-slate-900 group-hover:text-blue-500 transition-colors line-clamp-1">
                    {sub.language}
                  </h4>
                  <p className="text-[10px] lg:text-xs text-slate-400">
                    Subtitle Track
                  </p>
                </div>
              </div>
            </div>
            <a
              href={`${API_BASE}/api/proxy?url=${encodeURIComponent(sub.url)}&filename=${encodeURIComponent(`${sanitizeFilename(result.title)}_${sub.language}.${sub.ext}`)}&platform=${encodeURIComponent(result.platform || "generic")}&is_image=false`}
              download
              className="w-full py-2.5 lg:py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 btn-primary hover:opacity-90"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download {sub.ext}
            </a>
          </div>
        ))}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // MAIN RENDER
  // -----------------------------------------------------------------------
  return (
    <main className="relative min-h-screen flex flex-col bg-[#f8f9fa]">
      {/* ============================================================
          HERO & NAVBAR WRAPPER (Enterprise Minimalist Style)
          ============================================================ */}
      <div className="relative overflow-hidden bg-white pb-20 lg:pb-28 pt-2 border-b border-zinc-200">
        {/* Subtle grid background for professional feel */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        
        {/* Animated Background Auroras (Premium Edge-to-Edge) */}
        <div className="absolute top-[-20%] left-0 w-full h-[800px] pointer-events-none mix-blend-multiply opacity-70">
          <div className="absolute top-[-10%] -left-[20vw] w-[80vw] h-[600px] bg-blue-400 rounded-full blur-[120px] animate-blob"></div>
          <div className="absolute top-[-10%] -right-[20vw] w-[80vw] h-[600px] bg-sky-300 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-20 left-[10vw] w-[80vw] h-[600px] bg-cyan-300 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
        </div>

        {/* NAVBAR */}
        <nav className="relative z-10 w-full px-4 lg:px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center">
            <img src="/LogoJadi.png" alt="NEXA Logo" className="h-8 lg:h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-4 text-xs lg:text-sm font-medium">
            <span className="hidden md:inline text-slate-500 hover:text-slate-900 transition-colors cursor-default">
              {t.navDownloader}
            </span>
            <span className="hidden md:inline text-slate-500 hover:text-slate-900 transition-colors cursor-default">
              {t.navPlatforms}
            </span>
            <button
              onClick={() => {
                const newLang = lang === "id" ? "en" : "id";
                setLang(newLang);
                localStorage.setItem("lang", newLang);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 shadow-sm text-zinc-700 rounded-md text-[11px] font-bold tracking-wider transition-all group"
            >
              <svg className="w-4 h-4 text-zinc-500 group-hover:rotate-180 transition-transform duration-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {lang === "id" ? "INDONESIA" : "ENGLISH"}
            </button>
          </div>
        </nav>

        {/* HERO */}
        <div className="relative z-10 text-center mt-12 md:mt-16 lg:mt-20 px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 lg:mb-6 tracking-tighter text-zinc-950"
          >
            {t.heroTitle}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500 animate-text-shine">
              {t.heroSub}
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="text-zinc-500 text-sm md:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed font-medium"
          >
            {t.heroDesc}
          </motion.p>
        </div>
      </div>

      {/* ============================================================
          MAIN CONTENT
          ============================================================ */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-4 md:px-8 lg:px-12 pb-4 -mt-12 lg:-mt-16 w-full">
        <div className="w-full max-w-3xl xl:max-w-4xl flex-1 flex flex-col">
          
          {/* ---- INPUT BAR ---- */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            className="relative bg-white border border-zinc-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-1.5 md:p-2 mb-6 w-full transition-all focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:shadow-[0_8px_40px_rgb(37,99,235,0.08)]"
          >
            <form
              onSubmit={handleSubmit}
              className="relative flex flex-col sm:flex-row items-center w-full gap-2 z-10"
            >
              <div className="relative w-full flex items-center">
                <input
                  type="url"
                  placeholder={t.pasteLabel}
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  className="w-full bg-transparent border-none text-zinc-900 placeholder-zinc-400 font-medium text-sm lg:text-base px-5 py-4 outline-none disabled:opacity-50 transition-all focus:ring-0"
                />
                {url && !loading && (
                  <button
                    type="button"
                    onClick={() => {
                      setUrl("");
                      setResult(null);
                      setError("");
                    }}
                    className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-all bg-slate-100 hover:bg-slate-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-8 py-3.5 lg:py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm lg:text-base shrink-0 shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Extracting...</span>
                  </>
                ) : (
                  <>
                    Extract
                    <svg
                      className="w-3.5 h-3.5 lg:w-4 lg:h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>


          {/* ---- PLATFORM BADGES ---- */}
          {!result && !loading && !error && (
            <div 
              className="flex justify-center gap-2 lg:gap-3 flex-wrap fade-in-up mb-4"
              style={{ animationDelay: '0.4s' }}
            >
              {PLATFORMS.map((p) => (
                <span
                  key={p.name}
                  className={`badge-pill ${p.badge} px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-[11px] lg:text-xs font-semibold flex items-center gap-1.5 lg:gap-2 cursor-default`}
                >
                  {p.icon}
                  {p.name}
                </span>
              ))}
            </div>
          )}


          {/* ---- AD BANNER (TOP) ---- */}
          <AnimatePresence>
            {!loading && !result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <AdBanner
                  t={t}
                  className="mb-8"
                  adKey="d31d63c10f8f6f0016816fadb798f628"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---- ERROR ---- */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 border border-red-200 text-red-700 p-3.5 lg:p-5 rounded-xl lg:rounded-2xl mb-5 lg:mb-8 flex items-start gap-3"
              >
              <svg
                className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-bold text-red-800 text-sm">
                  Extraction Failed
                </h3>
                <p className="text-xs lg:text-sm mt-1 text-red-600">{error}</p>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* ---- RESULTS PANEL ---- */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="card-clean rounded-2xl lg:rounded-3xl p-4 md:p-6 lg:p-8"
              >
              <div className="flex flex-col md:flex-row gap-4 lg:gap-6 items-start mb-5 lg:mb-8 pb-5 lg:pb-8 border-b border-slate-200">
                <div
                  className={`relative shrink-0 rounded-xl lg:rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 group flex items-center justify-center ${result.platform?.toLowerCase() === "youtube" ? "w-full md:w-48 lg:w-60 xl:w-64 aspect-video" : "w-fit max-w-full mx-auto md:mx-0"}`}
                >
                  {result.thumbnail ? (
                    <img
                      src={buildImageUrl(
                        result.thumbnail,
                        "thumb",
                        0,
                        result.needs_proxy,
                        result.platform,
                        true,
                      )}
                      alt="Thumbnail"
                      className={`bg-black/20 transition-transform duration-700 group-hover:scale-[1.02] ${result.platform?.toLowerCase() === "youtube" ? "w-full h-auto object-cover" : "w-auto h-auto max-w-[16rem] max-h-64 object-contain"}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <svg
                        className="w-8 h-8 lg:w-10 lg:h-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5 lg:top-2 lg:right-2 flex flex-col gap-1.5">
                    {result.is_image_only && (
                      <span className="bg-pink-500 text-white text-[9px] lg:text-[10px] font-bold px-1.5 lg:px-2 py-0.5 rounded-md shadow">
                        PHOTO
                      </span>
                    )}
                    {result.duration && (
                      <span className="bg-black/70 backdrop-blur-sm text-white text-[9px] lg:text-[10px] font-bold px-1.5 lg:px-2 py-0.5 rounded-md shadow">
                        {formatDuration(result.duration)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-slate-900 mb-2 lg:mb-3 line-clamp-2 leading-snug">
                    {result.title}
                  </h2>
                  <div className="flex flex-wrap gap-1.5 lg:gap-2">
                    {(() => {
                      // Platform badge logic
                      const platLower = (
                        result.platform || "generic"
                      ).toLowerCase();
                      const platConfig = PLATFORMS.find(
                        (p) =>
                          p.name.toLowerCase() === platLower ||
                          platLower.includes(p.name.toLowerCase()) ||
                          (p.name === "Twitter/X" &&
                            platLower.includes("twitter")),
                      );

                      // Extraction type logic
                      const hasVideoAudio =
                        result.formats.video_audio.length > 0;
                      const hasAudioOnly = result.formats.audio_only.length > 0;
                      const hasCarousel =
                        result.images && result.images.length > 1;
                      const hasImage = result.is_image_only;

                      let extractType = "Media";
                      if (hasCarousel)
                        extractType = `${result.images.length} Slides`;
                      else if (hasImage) extractType = "1 Image";
                      else if (hasVideoAudio && hasAudioOnly)
                        extractType = "Video + Audio";
                      else if (hasVideoAudio) extractType = "Video";
                      else if (hasAudioOnly) extractType = "Audio Only";

                      return (
                        <>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 lg:py-1.5 rounded-lg text-[11px] lg:text-xs font-semibold capitalize badge-pill ${platConfig?.badge || ""}`}
                          >
                            {platConfig ? (
                              platConfig.icon
                            ) : (
                              <svg
                                className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-slate-400"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                              </svg>
                            )}
                            {result.platform}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 lg:py-1.5 rounded-lg bg-pink-50 border border-pink-200 text-[11px] lg:text-xs font-semibold text-pink-600">
                            {extractType}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex overflow-x-auto hide-scrollbar gap-1 md:gap-2 mb-4 lg:mb-6 p-1.5 bg-slate-50 rounded-lg lg:rounded-xl border border-slate-200 scroll-smooth">
                {!result.is_image_only && (
                  <>
                    {(
                      [
                        {
                          key: "video_audio",
                          label: "Video + Audio",
                          mobileLabel: "V+A",
                          count: result.formats.video_audio.length,
                        },
                        {
                          key: "video_only",
                          label: "Video Only",
                          mobileLabel: "Video",
                          count: result.formats.video_only.length,
                        },
                        {
                          key: "audio_only",
                          label: "Audio Only",
                          mobileLabel: "Audio",
                          count: result.formats.audio_only.length,
                        },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`shrink-0 px-2.5 md:px-3 lg:px-4 py-2 lg:py-2.5 rounded-md lg:rounded-lg text-[11px] md:text-xs lg:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                          activeTab === tab.key
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <span className="md:hidden">{tab.mobileLabel}</span>
                        <span className="hidden md:inline">{tab.label}</span>
                        <span
                          className={`ml-1 lg:ml-1.5 px-1 lg:px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-bold ${activeTab === tab.key ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </>
                )}
                {result.images && result.images.length > 0 && (
                  <button
                    onClick={() => setActiveTab("images")}
                    className={`shrink-0 px-2.5 md:px-3 lg:px-4 py-2 lg:py-2.5 rounded-md lg:rounded-lg text-[11px] md:text-xs lg:text-sm font-semibold transition-all duration-200 ${
                      activeTab === "images"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t.tabImages}
                    <span
                      className={`ml-1 lg:ml-1.5 px-1 lg:px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-bold ${activeTab === "images" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}
                    >
                      {result.images.length}
                    </span>
                  </button>
                )}
                {result.subtitles && result.subtitles.length > 0 && (
                  <button
                    onClick={() => setActiveTab("subtitles")}
                    className={`shrink-0 px-2.5 md:px-3 lg:px-4 py-2 lg:py-2.5 rounded-md lg:rounded-lg text-[11px] md:text-xs lg:text-sm font-semibold transition-all duration-200 ${
                      activeTab === "subtitles"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t.tabSubtitles}
                    <span
                      className={`ml-1 lg:ml-1.5 px-1 lg:px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-bold ${activeTab === "subtitles" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}
                    >
                      {result.subtitles.length}
                    </span>
                  </button>
                )}
              </div>

              <div className="min-h-[180px] lg:min-h-[220px]">
                {activeTab === "video_audio" &&
                  renderFormatGrid(result.formats.video_audio)}
                {activeTab === "video_only" &&
                  renderFormatGrid(result.formats.video_only)}
                {activeTab === "audio_only" &&
                  renderFormatGrid(result.formats.audio_only)}
                {activeTab === "images" && renderImages()}
                {activeTab === "subtitles" && renderSubtitles()}
              </div>

              {/* Reset */}
              <div className="mt-5 lg:mt-8 pt-4 lg:pt-6 border-t border-slate-200 flex justify-center">
                <button
                  onClick={() => {
                    setResult(null);
                    setUrl("");
                  }}
                  className="text-slate-500 hover:text-slate-900 text-xs lg:text-sm font-semibold flex items-center gap-2 transition-colors px-4 py-2.5 rounded-xl hover:bg-slate-100"
                >
                  <svg
                    className="w-3.5 h-3.5 lg:w-4 lg:h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Download Another
                </button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* ============================================================
              INFORMATIONAL SECTIONS
              ============================================================ */}

          {/* ---- PLATFORM SUPPORT ---- */}
          <FadeInView className="mt-20 lg:mt-32">
            <motion.h2 variants={staggerItem} className="text-2xl lg:text-3xl font-bold text-slate-900 mb-12 text-center">
              {t.platSectionTitle}
            </motion.h2>
            <div className="flex flex-col gap-10 lg:gap-14 max-w-5xl mx-auto px-6">
              {/* Unified 6 Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10 lg:gap-x-16">
                
                {/* YouTube */}
                <motion.div variants={staggerItem} className="flex items-start gap-5 group">
                  <div className="mt-1 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-red-600">
                      {t.platYtTitle}
                    </h3>
                    <p className="text-slate-500 text-[14.5px] leading-relaxed">
                      {t.platYtDesc}
                    </p>
                  </div>
                </motion.div>

                {/* TikTok */}
                <motion.div variants={staggerItem} className="flex items-start gap-5 group">
                  <div className="mt-1 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <svg className="w-5 h-5 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-slate-900">
                      {t.platTtTitle}
                    </h3>
                    <p className="text-slate-500 text-[14.5px] leading-relaxed">
                      {t.platTtDesc}
                    </p>
                  </div>
                </motion.div>

                {/* Instagram */}
                <motion.div variants={staggerItem} className="flex items-start gap-5 group">
                  <div className="mt-1 w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-pink-600">
                      {t.platIgTitle}
                    </h3>
                    <p className="text-slate-500 text-[14.5px] leading-relaxed">
                      {t.platIgDesc}
                    </p>
                  </div>
                </motion.div>

                {/* Twitter / X */}
                <motion.div variants={staggerItem} className="flex items-start gap-5 group">
                  <div className="mt-1 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <svg className="w-4 h-4 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-slate-900">
                      {t.platTwTitle}
                    </h3>
                    <p className="text-slate-500 text-[14.5px] leading-relaxed">
                      {t.platTwDesc}
                    </p>
                  </div>
                </motion.div>

                {/* Facebook */}
                <motion.div variants={staggerItem} className="flex items-start gap-5 group">
                  <div className="mt-1 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-blue-600">
                      {t.platFbTitle}
                    </h3>
                    <p className="text-slate-500 text-[14.5px] leading-relaxed">
                      {t.platFbDesc}
                    </p>
                  </div>
                </motion.div>

                {/* Pinterest */}
                <motion.div variants={staggerItem} className="flex items-start gap-5 group">
                  <div className="mt-1 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <svg className="w-5 h-5 text-[#E60023]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.182 0 7.436 2.983 7.436 6.953 0 4.156-2.618 7.502-6.257 7.502-1.22 0-2.368-.635-2.76-1.385l-.754 2.875c-.272 1.039-1.015 2.34-1.51 3.136 1.43.441 2.955.679 4.536.679 6.621 0 11.988-5.368 11.988-11.988 0-6.62-5.367-11.987-11.988-11.987z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-[#E60023]">
                      {t.platPinTitle}
                    </h3>
                    <p className="text-slate-500 text-[14.5px] leading-relaxed">
                      {t.platPinDesc}
                    </p>
                  </div>
                </motion.div>

                {/* Bstation / Bilibili */}
                <motion.div variants={staggerItem} className="flex items-start gap-5 group">
                  <div className="mt-1 w-12 h-12 rounded-full bg-[#00A1D6]/10 flex items-center justify-center shrink-0 border border-[#00A1D6]/20 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <svg className="w-5 h-5 text-[#00A1D6]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.72c.267-.249.573-.373.92-.373.347 0 .662.124.947.373.284.249.426.551.426.907s-.142.65-.426.906l-1.174 1.12zM5.333 7.24c-.746.018-1.373.276-1.88.774-.506.497-.764 1.124-.773 1.88v7.36c.009.755.267 1.382.773 1.88.507.498 1.134.755 1.88.773h13.334c.746-.018 1.373-.275 1.88-.773.506-.498.764-1.125.773-1.88v-7.36c-.009-.756-.267-1.383-.773-1.88-.507-.498-1.134-.756-1.88-.774H5.333zM7.067 10.653c.409 0 .755.142 1.04.427.284.284.426.63.426 1.04v1.813c0 .409-.142.756-.426 1.04-.285.285-.631.427-1.04.427-.409 0-.756-.142-1.04-.427-.285-.284-.427-.631-.427-1.04v-1.813c0-.409.142-.756.427-1.04.284-.285.631-.427 1.04-.427zm10.133 0c.409 0 .756.142 1.04.427.285.284.427.63.427 1.04v1.813c0 .409-.142.756-.427 1.04-.284.285-.631.427-1.04.427-.409 0-.756-.142-1.04-.427-.285-.284-.427-.631-.427-1.04v-1.813c0-.409.142-.756.427-1.04.284-.285.631-.427 1.04-.427z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-[#00A1D6]">
                      {t.platBsTitle}
                    </h3>
                    <p className="text-slate-500 text-[14.5px] leading-relaxed">
                      {t.platBsDesc}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </FadeInView>

          {/* ---- HOW TO USE ---- */}
          <FadeInView className="mt-20 lg:mt-32">
            <motion.h2 variants={staggerItem} className="text-2xl lg:text-3xl font-bold text-slate-900 mb-12 text-center">
              {t.howToTitle}
            </motion.h2>
            <div className="flex flex-col md:flex-row gap-8 lg:gap-10 justify-center relative max-w-4xl mx-auto px-6">
              {/* Connecting line (desktop) */}
              <div className="hidden md:block absolute top-6 left-[16%] right-[16%] h-[1px] bg-slate-200" />

              {/* Step 1 */}
              <motion.div variants={staggerItem} className="relative z-10 flex flex-col items-center text-center flex-1 group">
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 shadow-sm ring-8 ring-[#f8f9fa] transition-all duration-300 group-hover:scale-110">
                  <span className="text-blue-600 font-bold text-lg">1</span>
                </div>
                <h3 className="text-[17px] font-bold text-slate-900 mb-2.5">
                  {t.howTo1Title}
                </h3>
                <p className="text-slate-500 text-[14.5px] leading-relaxed max-w-[260px] mx-auto">
                  {t.howTo1Desc}
                </p>
              </motion.div>

              {/* Step 2 */}
              <motion.div variants={staggerItem} className="relative z-10 flex flex-col items-center text-center flex-1 group">
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 shadow-sm ring-8 ring-[#f8f9fa] transition-all duration-300 group-hover:scale-110">
                  <span className="text-blue-600 font-bold text-lg">2</span>
                </div>
                <h3 className="text-[17px] font-bold text-slate-900 mb-2.5">
                  {t.howTo2Title}
                </h3>
                <p className="text-slate-500 text-[14.5px] leading-relaxed max-w-[260px] mx-auto">
                  {t.howTo2Desc}
                </p>
              </motion.div>

              {/* Step 3 */}
              <motion.div variants={staggerItem} className="relative z-10 flex flex-col items-center text-center flex-1 group">
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 shadow-sm ring-8 ring-[#f8f9fa] transition-all duration-300 group-hover:scale-110">
                  <span className="text-blue-600 font-bold text-lg">3</span>
                </div>
                <h3 className="text-[17px] font-bold text-slate-900 mb-2.5">
                  {t.howTo3Title}
                </h3>
                <p className="text-slate-500 text-[14.5px] leading-relaxed max-w-[260px] mx-auto">
                  {t.howTo3Desc}
                </p>
              </motion.div>
            </div>
          </FadeInView>

          {/* ---- ADVANTAGES ---- */}
          <FadeInView className="mt-20 lg:mt-32">
            <motion.h2 variants={staggerItem} className="text-2xl lg:text-3xl font-bold text-slate-900 mb-12 text-center">
              {t.featSectionTitle}
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 lg:gap-x-16 lg:gap-y-14 max-w-5xl mx-auto px-6">
              <motion.div variants={staggerItem} className="flex items-start gap-5">
                <div className="mt-1 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold mb-2 text-[17px]">
                    {t.feat1Title}
                  </h4>
                  <p className="text-slate-500 text-[14.5px] leading-relaxed">
                    {t.feat1Desc}
                  </p>
                </div>
              </motion.div>
              <motion.div variants={staggerItem} className="flex items-start gap-5">
                <div className="mt-1 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold mb-2 text-[17px]">
                    {t.feat2Title}
                  </h4>
                  <p className="text-slate-500 text-[14.5px] leading-relaxed">
                    {t.feat2Desc}
                  </p>
                </div>
              </motion.div>
              <motion.div variants={staggerItem} className="flex items-start gap-5">
                <div className="mt-1 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold mb-2 text-[17px]">
                    {t.feat4Title}
                  </h4>
                  <p className="text-slate-500 text-[14.5px] leading-relaxed">
                    {t.feat4Desc}
                  </p>
                </div>
              </motion.div>
              <motion.div variants={staggerItem} className="flex items-start gap-5">
                <div className="mt-1 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold mb-2 text-[17px]">
                    {t.feat3Title}
                  </h4>
                  <p className="text-slate-500 text-[14.5px] leading-relaxed">
                    {t.feat3Desc}
                  </p>
                </div>
              </motion.div>
            </div>
          </FadeInView>

          {/* ---- FAQ ---- */}
          <FadeInView className="mt-20 lg:mt-32 mb-16 lg:mb-20">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-10 text-center">
              {t.faqTitle}
            </h2>
            <div className="max-w-3xl mx-auto px-6">
              <div className="border-t border-slate-200 divide-y divide-slate-200">
                
                <motion.div variants={staggerItem} className="py-5 lg:py-6 flex flex-col md:flex-row gap-2 md:gap-6 lg:gap-10">
                  <h4 className="text-slate-900 font-semibold text-[17px] md:w-1/3 shrink-0">
                    {t.faq1Q}
                  </h4>
                  <p className="text-slate-500 text-[15px] leading-relaxed">
                    {t.faq1A}
                  </p>
                </motion.div>

                <motion.div variants={staggerItem} className="py-5 lg:py-6 flex flex-col md:flex-row gap-2 md:gap-6 lg:gap-10">
                  <h4 className="text-slate-900 font-semibold text-[17px] md:w-1/3 shrink-0">
                    {t.faq2Q}
                  </h4>
                  <p className="text-slate-500 text-[15px] leading-relaxed">
                    {t.faq2A}
                  </p>
                </motion.div>

                <motion.div variants={staggerItem} className="py-5 lg:py-6 flex flex-col md:flex-row gap-2 md:gap-6 lg:gap-10">
                  <h4 className="text-slate-900 font-semibold text-[17px] md:w-1/3 shrink-0">
                    {t.faq3Q}
                  </h4>
                  <p className="text-slate-500 text-[15px] leading-relaxed">
                    {t.faq3A}
                  </p>
                </motion.div>

              </div>
            </div>
          </FadeInView>

          <AdBanner t={t} className="mb-4 lg:mb-8" />
          <div className="flex-1" />
        </div>
      </div>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="relative z-10 w-full px-6 md:px-8 lg:px-12 fade-in-up pb-8 lg:pb-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-200/60 pt-8 lg:pt-10">
          <div className="flex flex-col items-center md:items-start gap-1.5">
            <div className="flex items-center mb-0.5">
              <img src="/LogoJadi.png" alt="NEXA Logo" className="h-6 lg:h-8 w-auto object-contain" />
            </div>
            <p className="text-slate-500 text-[13.5px]">
              {t.footerRights}
            </p>
          </div>
          
          <div className="flex items-center gap-8 mt-2 md:mt-0">
            <a
              href="/privacy-policy"
              className="text-slate-500 hover:text-slate-900 text-[13.5px] font-semibold transition-colors"
            >
              {t.footerPrivacy}
            </a>
            <a
              href="/terms"
              className="text-slate-500 hover:text-slate-900 text-[13.5px] font-semibold transition-colors"
            >
              {t.footerTerms}
            </a>
          </div>
        </div>
      </footer>

      {/* ============================================================
          FLOATING ACTION BUTTON (REPORT ISSUE)
          ============================================================ */}
      <button
        onClick={() => setShowContactModal(true)}
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-40 flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 btn-primary rounded-full shadow-lg hover:-translate-y-1 transition-all duration-300 group"
      >
        <svg
          className="w-7 h-7 lg:w-8 lg:h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        <span className="absolute right-full mr-4 px-3 py-1.5 bg-white text-slate-700 text-xs font-semibold rounded-lg shadow-lg border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap hidden md:block">
          {t.contactHelpCenter}
        </span>
      </button>

      {/* ============================================================
          CONTACT MODAL (WHATSAPP & DIRECT CHAT)
          ============================================================ */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200/50 rounded-[24px] p-7 lg:p-10 max-w-[420px] w-full shadow-[0_24px_60px_-15px_rgba(0,0,0,0.15)] relative overflow-hidden">

            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <h3 className="text-[22px] font-black tracking-tight text-slate-900 mb-2">
              {t.contactTitle}
            </h3>
            <p className="text-slate-500 text-sm mb-6">{t.contactDesc}</p>

            <a
              href="https://wa.me/6282216631335?text=Halo%20Admin%20NEXA,%20saya%20mengalami%20kendala%20saat%20menggunakan%20Downloader.%20Bisa%20bantu%20saya?"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mb-6 py-3.5 px-4 bg-[#25D366] hover:bg-[#1DA851] text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(37,211,102,0.5)] hover:shadow-[0_12px_24px_-8px_rgba(37,211,102,0.6)] hover:-translate-y-0.5"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {t.contactWa}
            </a>

            <div className="flex items-center gap-4 mb-7">
              <div className="h-px bg-slate-100 flex-1"></div>
              <span className="text-slate-400 text-[11px] font-extrabold uppercase tracking-widest">
                {t.contactEmail}
              </span>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>

            {contactFormStatus === "success" ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center fade-in-up">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h4 className="text-green-700 font-bold mb-1">
                  Pesan Terkirim!
                </h4>
                <p className="text-slate-500 text-sm">{t.contactSuccessDesc}</p>
                <button
                  onClick={() => setContactFormStatus("idle")}
                  className="mt-4 text-slate-500 hover:text-slate-700 text-sm font-semibold transition-colors"
                >
                  Kirim pesan lain
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const email = formData.get("email");
                  const message = formData.get("message");

                  setContactFormStatus("sending");
                  try {
                    await fetch(`${API_BASE}/api/report`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email, message }),
                    });
                  } catch (err) {
                    console.error("Failed to send report:", err);
                  } finally {
                    setContactFormStatus("success");
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1.5 ml-1">
                    {t.contactEmailLabel}
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder={t.contactEmailPlaceholder}
                    className="w-full bg-slate-50 border border-slate-200/70 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 shadow-sm focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1.5 ml-1">
                    {t.contactMsgLabel}
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={3}
                    placeholder={t.contactMsgPlaceholder}
                    className="w-full bg-slate-50 border border-slate-200/70 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 shadow-sm focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={contactFormStatus === "sending"}
                  className="w-full py-3.5 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_20px_-8px_rgba(0,0,0,0.4)]"
                >
                  {contactFormStatus === "sending" ? (
                    <svg
                      className="w-5 h-5 animate-spin text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  ) : (
                    t.contactSendBtn
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Merge Alert Modal */}
      {mergeAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 p-6 lg:p-8 rounded-2xl max-w-md w-full shadow-2xl text-center relative">
            {mergeAlert.status === "done" ? (
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-green-200">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ) : mergeAlert.status === "error" ? (
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-200">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-200">
                <svg
                  className="w-8 h-8 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
            )}

            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {mergeAlert.status === "processing_subtitle"
                ? t.modalSubTitle
                : mergeAlert.status === "fake_animating"
                  ? t.modalPrep
                  : mergeAlert.status === "merging"
                    ? mergeAlert.filename.endsWith(".mp3")
                      ? t.modalConvMp3
                      : t.modalMerge
                    : mergeAlert.status === "done"
                      ? t.modalDone
                      : mergeAlert.status === "error"
                        ? t.modalErr
                        : mergeAlert.filename.endsWith(".mp3")
                          ? t.modalAudioTitle
                          : t.modalServerDl}
            </h3>

            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              {mergeAlert.status === "done" ? (
                t.modalReady
              ) : mergeAlert.status === "error" ? (
                t.modalErrorText
              ) : mergeAlert.status === "fake_animating" ? (
                t.modalCached
              ) : (
                <>
                  {t.modalWarning1}{" "}
                  <span className="text-red-500 font-bold">
                    {t.modalWarning2}
                  </span>{" "}
                  {t.modalWarning3}
                </>
              )}
            </p>

            {/* Progress Bar */}
            {mergeAlert.status !== "done" && mergeAlert.status !== "error" && (
              <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, mergeAlert.percent))}%`,
                  }}
                ></div>
              </div>
            )}
            {mergeAlert.status !== "done" && mergeAlert.status !== "error" && (
              <div className="text-xs font-bold text-blue-500 mb-6">
                {Math.round(mergeAlert.percent)}% {t.modalFinished}
              </div>
            )}
            {mergeAlert.status === "done" && <div className="mb-6"></div>}

            <button
              onClick={() =>
                setMergeAlert({
                  show: false,
                  filename: "",
                  taskId: "",
                  percent: 0,
                  status: "",
                })
              }
              className={`w-full py-3 text-white font-bold rounded-xl transition-all active:scale-95 ${
                mergeAlert.status === "done"
                  ? "bg-green-500 hover:bg-green-600"
                  : mergeAlert.status === "error"
                    ? "bg-slate-500 hover:bg-slate-600"
                    : "bg-red-50 text-red-500 hover:bg-red-100"
              }`}
            >
              {mergeAlert.status === "done" || mergeAlert.status === "error"
                ? t.modalClose
                : t.modalHide}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
