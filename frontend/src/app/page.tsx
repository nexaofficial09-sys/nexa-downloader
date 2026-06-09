"use client";

import { useState, useEffect, type FormEvent } from "react";

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
}

const API_BASE = "https://api.nexalabs.my.id";

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
): string {
  const fname = `${sanitizeFilename(title)}_img${idx}.jpg`;
  // Always proxy if we want to force a download (!preview), so the browser can download it natively
  if (proxy || !preview)
    return `${API_BASE}/api/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(fname)}&platform=${encodeURIComponent(platform)}&is_image=true&preview=${preview}`;
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
        className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white"
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
        className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white"
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

const AdBanner = ({ className = "" }: { className?: string }) => (
  <div className={`w-full max-w-4xl mx-auto my-6 bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center overflow-hidden relative group ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 border border-slate-700/50 px-2 py-0.5 rounded-full">Ruang Iklan Sponsor</span>
    <h3 className="text-lg font-black text-slate-300 drop-shadow-md">Pasang Iklan Anda di Sini</h3>
    <p className="text-xs text-slate-400 mt-1 max-w-md">Jangkau ribuan pengguna NEXA Downloader setiap harinya. Hubungi admin untuk detail pemasangan.</p>
  </div>
);

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [activeTab, setActiveTab] = useState<
    "video_audio" | "video_only" | "audio_only" | "images"
  >("video_audio");
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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
        original_url: res.original_url
      };
      const filtered = prev.filter(h => h.original_url !== res.original_url);
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
      const updated = prev.filter(h => h.id !== id);
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
    if (mergeAlert.show && (mergeAlert.status === "downloading" || mergeAlert.status === "merging")) {
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
            }, 400); // slight delay at 100% before showing "Selesai!"

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
      addToHistory(data);
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
            className="w-8 h-8 lg:w-10 lg:h-10 mx-auto mb-3 text-slate-600"
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
          <p className="text-xs lg:text-sm text-slate-500">
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
                  ? "bg-blue-500/5 border-blue-500/20"
                  : isPremium
                    ? "bg-cyan-500/5 border-cyan-500/15"
                    : "bg-white/[0.03] border-white/[0.06]"
              }`}
            >
              {isBest && (
                <div className="absolute top-0 right-0 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-[10px] font-bold text-white rounded-bl-xl tracking-wider">
                  ★ BEST
                </div>
              )}
              {isPremium && !isBest && (
                <div className="absolute top-0 right-0 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-400 text-[10px] font-bold text-white rounded-bl-xl tracking-wider">
                  HIGH RES
                </div>
              )}
              <div className="flex justify-between items-center mb-2 lg:mb-3">
                <span className="text-lg lg:text-2xl font-black tracking-tight text-white">
                  {fmt.resolution || "Audio"}
                </span>
                {fmt.filesize_label && (
                  <span className="text-[11px] font-semibold text-slate-400 bg-white/[0.06] px-2 py-1 rounded-lg">
                    {fmt.filesize_label}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mb-3 lg:mb-5">
                <span className="text-[10px] uppercase font-bold text-slate-500 bg-white/[0.05] rounded-md px-2 py-0.5 tracking-wider">
                  {fmt.ext}
                </span>
                {fmt.needs_merge && (
                  <span className={`text-[10px] uppercase font-bold rounded-md px-2 py-0.5 flex items-center gap-1 tracking-wider border ${fmt.ext === 'mp3' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'}`}>
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
                        d={fmt.ext === 'mp3' ? "M9 19V6l12-3v13M9 19c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm12-3c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM9 10l12-3" : "M13 10V3L4 14h7v7l9-11h-7z"}
                      />
                    </svg>
                    {fmt.ext === 'mp3' ? 'Convert' : 'Merge'}
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
                        // Cached file, play fake animation
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
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white btn-glow"
                    : "bg-white/10 hover:bg-white/[0.15] text-white"
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
                Download
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
      <div className="columns-2 md:columns-3 xl:columns-4 gap-2.5 lg:gap-4 space-y-2.5 lg:space-y-4 fade-in-up">
        {result.images.map((img, idx) => {
          const imgUrl = buildImageUrl(
            img.url,
            result.title,
            idx + 1,
            result.needs_proxy,
            result.platform,
            true,
          );
          const downloadUrl = buildImageUrl(
            img.url,
            result.title,
            idx + 1,
            result.needs_proxy,
            result.platform,
            false,
          );
          const isYtShort =
            result.platform?.toLowerCase() === "youtube" &&
            result.original_url?.includes("/shorts/");
          return (
            <div
              key={img.id}
              className="group relative rounded-xl lg:rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-blue-500/20 transition-all duration-300 break-inside-avoid"
            >
              <img
                src={imgUrl}
                alt={`Slide ${idx + 1}`}
                className={`w-full block transition-transform duration-700 group-hover:scale-[1.02] ${isYtShort ? "aspect-[9/16] object-cover" : "h-auto object-contain"}`}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.failed) {
                    target.dataset.failed = 'true';
                    target.src = img.url;
                  } else {
                    target.src = '/logo.png'; // Ultimate fallback
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-2 lg:p-3 translate-y-0 lg:translate-y-3 lg:group-hover:translate-y-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-white text-slate-900 text-[11px] lg:text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-50 transition-colors shadow-xl active:scale-95"
                >
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
                </a>
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
  // MAIN RENDER
  // -----------------------------------------------------------------------
  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[400px] lg:w-[700px] h-[300px] lg:h-[500px] bg-blue-600/[0.07] rounded-full filter blur-[100px] lg:blur-[140px] animate-blob pointer-events-none" />
      <div className="absolute bottom-[5%] left-[10%] w-[200px] lg:w-[350px] h-[200px] lg:h-[350px] bg-cyan-500/[0.04] rounded-full filter blur-[80px] lg:blur-[120px] animate-blob animation-delay-2000 pointer-events-none" />
      <div className="absolute top-[50%] right-[5%] w-[180px] lg:w-[300px] h-[180px] lg:h-[300px] bg-indigo-500/[0.04] rounded-full filter blur-[80px] lg:blur-[120px] animate-blob animation-delay-4000 pointer-events-none" />

      {/* ============================================================
          NAVBAR
          ============================================================ */}
      <nav className="relative z-20 w-full px-6 md:px-8 lg:px-12 py-4 lg:py-5 fade-in-up">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 lg:gap-3">
            <img
              src="/logo.png"
              alt="NEXA Logo"
              className="w-8 h-8 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl object-cover shadow-lg shadow-blue-500/15"
            />
            <span className="text-base lg:text-xl font-black text-white tracking-tight">
              NEXA<span className="text-blue-400">.</span>
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-6 text-sm text-slate-500">
            <span className="hover:text-white transition-colors cursor-default">
              Downloader
            </span>
            <span className="hover:text-white transition-colors cursor-default">
              Supported Platforms
            </span>
          </div>
        </div>
      </nav>

      {/* ============================================================
          MAIN CONTENT
          ============================================================ */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 md:px-8 lg:px-12 pb-4">
        <div className="w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl flex-1 flex flex-col">
          {/* ---- HERO ---- */}
          <div className="text-center mt-6 md:mt-10 lg:mt-16 xl:mt-20 mb-6 lg:mb-10 fade-in-up">
            <h1 className="text-[2.2rem] leading-[1.1] md:text-5xl lg:text-6xl xl:text-7xl font-black mb-3 lg:mb-5 tracking-tight text-white text-glow">
              Pengunduh{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                Multi-Platform
              </span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base lg:text-lg max-w-md lg:max-w-xl mx-auto leading-relaxed mb-5">
              Ekstrak video resolusi tinggi, audio jernih, dan{" "}
              <strong>Slide Foto (Carousel)</strong> dengan mudah. Sistem telah
              di-upgrade dengan Bypass Anti-Bot terbaru untuk hasil yang lebih
              maksimal.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-3 text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span className="px-2.5 py-1 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                YT Shorts
              </span>
              <span className="px-2.5 py-1 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                TikTok Slide
              </span>
              <span className="px-2.5 py-1 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                IG Reels
              </span>
              <span className="px-2.5 py-1 bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/20 rounded-lg">
                FB Album Fix
              </span>
              <span className="px-2.5 py-1 bg-white/10 text-white border border-white/20 rounded-lg">
                X (Twitter) Bypass
              </span>
            </div>
          </div>

          {/* ---- INPUT BAR ---- */}
          <div className="glass-dark input-glow rounded-xl lg:rounded-2xl p-1.5 lg:p-2 mb-5 lg:mb-8 fade-in-up">
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center w-full"
            >
              <div className="absolute left-3 lg:left-5 text-blue-400/60 pointer-events-none">
                <svg
                  className="w-4 h-4 lg:w-5 lg:h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <input
                type="url"
                placeholder="Paste social media link here..."
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="w-full bg-transparent text-white placeholder-slate-500 text-sm lg:text-base xl:text-lg pl-10 lg:pl-14 pr-[140px] lg:pr-[210px] py-3.5 lg:py-4 xl:py-5 outline-none disabled:opacity-50 rounded-xl"
              />
              <div className="absolute right-1.5 lg:right-2 top-1.5 lg:top-2 bottom-1.5 lg:bottom-2 flex items-center gap-1.5 lg:gap-3">
                {url && !loading && (
                  <button
                    type="button"
                    onClick={() => setUrl("")}
                    className="p-2 lg:p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95 flex items-center justify-center shrink-0"
                    title="Clear link"
                    aria-label="Clear link"
                  >
                    <svg
                      className="w-4 h-4 lg:w-5 lg:h-5"
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
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-full px-5 lg:px-7 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-lg lg:rounded-xl hover:from-blue-500 hover:to-cyan-400 active:scale-[0.97] transition-all disabled:opacity-60 btn-glow flex items-center gap-1.5 lg:gap-2 text-xs lg:text-base shrink-0"
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
                      <span className="hidden lg:inline">Extracting…</span>
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
                </button>
              </div>
            </form>
          </div>

          {/* ---- PLATFORM BADGES ---- */}
          {!result && !loading && !error && (
            <div className="flex justify-center gap-2 lg:gap-3 flex-wrap fade-in-up mb-4">
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
          {!loading && !result && <AdBanner className="mb-8 fade-in-up" />}

          {/* ---- ERROR ---- */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3.5 lg:p-5 rounded-xl lg:rounded-2xl mb-5 lg:mb-8 flex items-start gap-3 fade-in-up">
              <svg
                className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
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
                <h3 className="font-bold text-red-200 text-sm">
                  Extraction Failed
                </h3>
                <p className="text-xs lg:text-sm mt-1 text-red-300/80">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* ---- RESULTS PANEL ---- */}
          {result && (
            <div className="glass-dark rounded-2xl lg:rounded-3xl p-4 md:p-6 lg:p-8 fade-in-up">
              <div className="flex flex-col md:flex-row gap-4 lg:gap-6 items-start mb-5 lg:mb-8 pb-5 lg:pb-8 border-b border-white/[0.06]">
                <div
                  className={`relative shrink-0 rounded-xl lg:rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] group flex items-center justify-center ${result.platform?.toLowerCase() === "tiktok" || result.original_url?.includes("/shorts/") || result.original_url?.includes("/reel/") ? "w-36 sm:w-48 md:w-32 lg:w-40 xl:w-48 aspect-[9/16] mx-auto md:mx-0" : "w-full md:w-48 lg:w-60 xl:w-64 aspect-video"}`}
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
                      className={`w-full h-full bg-black/20 transition-transform duration-700 group-hover:scale-[1.02] ${["youtube", "tiktok", "instagram"].includes(result.platform?.toLowerCase() || "") ? "object-cover" : "object-contain"}`}
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
                  <h2 className="text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-white mb-2 lg:mb-3 line-clamp-2 leading-snug">
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
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 lg:py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-[11px] lg:text-xs font-semibold text-pink-300">
                            {extractType}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex overflow-x-auto hide-scrollbar gap-1 mb-4 lg:mb-6 p-1 bg-white/[0.03] rounded-lg lg:rounded-xl border border-white/[0.04]">
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
                            ? "bg-white/10 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        <span className="md:hidden">{tab.mobileLabel}</span>
                        <span className="hidden md:inline">{tab.label}</span>
                        <span
                          className={`ml-1 lg:ml-1.5 px-1 lg:px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-bold ${activeTab === tab.key ? "bg-blue-500/20 text-blue-300" : "bg-white/[0.05] text-slate-500"}`}
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
                        ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm btn-glow"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Images
                    <span
                      className={`ml-1 lg:ml-1.5 px-1 lg:px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-bold ${activeTab === "images" ? "bg-white/20 text-white" : "bg-white/[0.05] text-slate-500"}`}
                    >
                      {result.images.length}
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
              </div>

              {/* Reset */}
              <div className="mt-5 lg:mt-8 pt-4 lg:pt-6 border-t border-white/[0.06] flex justify-center">
                <button
                  onClick={() => {
                    setResult(null);
                    setUrl("");
                  }}
                  className="text-slate-500 hover:text-white text-xs lg:text-sm font-semibold flex items-center gap-2 transition-colors px-4 py-2.5 rounded-xl hover:bg-white/[0.05]"
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
            </div>
          )}

          {/* ============================================================
              INFORMATIONAL SECTIONS
              ============================================================ */}

          {/* ---- PLATFORM SUPPORT ---- */}
          <div className="mt-20 lg:mt-32 fade-in-up">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-8 text-center text-glow">
              Pengunduh Multi-Platform
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Card 1 */}
              <div className="glass-dark p-6 rounded-2xl hover:border-red-500/30 transition-colors duration-300 group">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                  <svg
                    className="w-6 h-6 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Pengunduh YouTube
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  NEXA mendukung unduhan video MP4, audio MP3, dan YouTube
                  Shorts dengan resolusi tinggi tanpa batasan.
                </p>
              </div>
              {/* Card 2 */}
              <div className="glass-dark p-6 rounded-2xl hover:border-white/30 transition-colors duration-300 group">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  TikTok Tanpa Watermark
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Unduh video TikTok favorit Anda tanpa logo/watermark dengan
                  proses ekstraksi super cepat.
                </p>
              </div>
              {/* Card 3 */}
              <div className="glass-dark p-6 rounded-2xl hover:border-pink-500/30 transition-colors duration-300 group">
                <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                  <svg
                    className="w-6 h-6"
                    fill="url(#ig-grad)"
                    viewBox="0 0 24 24"
                  >
                    <defs>
                      <linearGradient
                        id="ig-grad"
                        x1="2"
                        y1="22"
                        x2="22"
                        y2="2"
                      >
                        <stop offset="0%" stopColor="#feda75" />
                        <stop offset="25%" stopColor="#fa7e1e" />
                        <stop offset="50%" stopColor="#d62976" />
                        <stop offset="75%" stopColor="#962fbf" />
                        <stop offset="100%" stopColor="#4f5bd5" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Unduhan Instagram
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Simpan gambar Carousel (multi-slide), Reels, IGTV, dan
                  Postingan Foto dengan sekali klik.
                </p>
              </div>
              {/* Card 4 */}
              <div className="glass-dark p-6 rounded-2xl hover:border-white/30 transition-colors duration-300 group">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Twitter / X
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Simpan video viral, klip pendek, maupun gambar dari lini masa
                  Twitter (X) langsung ke perangkat Anda.
                </p>
              </div>
              {/* Card 5 */}
              <div className="glass-dark p-6 rounded-2xl hover:border-blue-500/30 transition-colors duration-300 group">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                  <svg
                    className="w-6 h-6 text-[#1877F2]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Video Facebook
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Unduh berbagai format video dari grup publik, halaman
                  komunitas, maupun profil personal di Facebook.
                </p>
              </div>
            </div>
          </div>

          {/* ---- HOW TO USE ---- */}
          <div className="mt-20 lg:mt-32 fade-in-up">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-10 text-center text-glow">
              Cara Menggunakan NEXA
            </h2>
            <div className="flex flex-col md:flex-row gap-8 lg:gap-10 justify-center relative px-6 lg:px-12">
              {/* Connecting line (desktop) */}
              <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-white/10 z-0" />

              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center text-center flex-1 group">
                <div className="w-16 h-16 rounded-2xl bg-[#070b14] border border-blue-500/20 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:border-blue-400/40 group-hover:scale-110 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-500/10" />
                  <span className="text-blue-400 font-black text-xl relative z-10">
                    1
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Salin Tautan
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Salin tautan video, musik, atau postingan foto yang ingin Anda
                  unduh.
                </p>
              </div>
              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center text-center flex-1 group">
                <div className="w-16 h-16 rounded-2xl bg-[#070b14] border border-blue-500/20 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:border-blue-400/40 group-hover:scale-110 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-500/10" />
                  <span className="text-blue-400 font-black text-xl relative z-10">
                    2
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Tempel Tautan
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Tempelkan tautan tersebut pada kolom pencarian di atas, sistem
                  akan memprosesnya otomatis.
                </p>
              </div>
              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center text-center flex-1 group">
                <div className="w-16 h-16 rounded-2xl bg-[#070b14] border border-blue-500/20 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:border-blue-400/40 group-hover:scale-110 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-500/10" />
                  <span className="text-blue-400 font-black text-xl relative z-10">
                    3
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Pilih &amp; Unduh
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Pilih format atau resolusi yang tersedia, lalu klik tombol
                  Simpan atau Unduh.
                </p>
              </div>
            </div>
          </div>

          {/* ---- ADVANTAGES ---- */}
          <div className="mt-20 lg:mt-32 glass-dark rounded-[2rem] p-8 md:p-12 fade-in-up border border-blue-500/10">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-10 text-center text-glow">
              Keuntungan Menggunakan Kami
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
              <div className="flex items-start gap-4 lg:gap-5">
                <div className="mt-0.5 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <svg
                    className="w-5 h-5 text-blue-400"
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
                  <h4 className="text-white font-bold mb-1.5 text-lg">
                    100% Gratis Selamanya
                  </h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Tanpa biaya langganan, tanpa batasan jumlah unduhan. Bebas
                    digunakan kapan saja.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 lg:gap-5">
                <div className="mt-0.5 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <svg
                    className="w-5 h-5 text-blue-400"
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
                  <h4 className="text-white font-bold mb-1.5 text-lg">
                    Kecepatan Unduh Maksimal
                  </h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Server kami dioptimalkan untuk mengekstrak dan mengunduh
                    media dengan kecepatan tinggi.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 lg:gap-5">
                <div className="mt-0.5 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <svg
                    className="w-5 h-5 text-blue-400"
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
                  <h4 className="text-white font-bold mb-1.5 text-lg">
                    Aman &amp; Tanpa Iklan Mengganggu
                  </h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Platform bersih tanpa popup berbahaya atau iklan yang
                    menutupi konten utama.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 lg:gap-5">
                <div className="mt-0.5 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <svg
                    className="w-5 h-5 text-blue-400"
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
                  <h4 className="text-white font-bold mb-1.5 text-lg">
                    Mendukung Resolusi 4K
                  </h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Unduh video dengan kualitas terbaik hingga 4K atau audio
                    jernih (320kbps).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ---- FAQ ---- */}
          <div className="mt-20 lg:mt-32 mb-16 lg:mb-20 fade-in-up">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-8 text-center text-glow">
              Pertanyaan yang Sering Diajukan
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="glass-dark p-5 lg:p-6 rounded-2xl hover:border-blue-500/20 transition-colors">
                <h4 className="text-white font-bold mb-2 flex items-center gap-3">
                  <span className="text-blue-400 font-black text-xl">Q</span>
                  Apakah NEXA Downloader gratis?
                </h4>
                <p className="text-slate-400 text-sm ml-7 lg:ml-8 leading-relaxed">
                  Ya, layanan kami sepenuhnya gratis tanpa perlu registrasi.
                </p>
              </div>
              <div className="glass-dark p-5 lg:p-6 rounded-2xl hover:border-blue-500/20 transition-colors">
                <h4 className="text-white font-bold mb-2 flex items-center gap-3">
                  <span className="text-blue-400 font-black text-xl">Q</span>
                  Di mana file saya disimpan?
                </h4>
                <p className="text-slate-400 text-sm ml-7 lg:ml-8 leading-relaxed">
                  File akan otomatis tersimpan di folder 'Downloads' pada
                  perangkat Anda.
                </p>
              </div>
              <div className="glass-dark p-5 lg:p-6 rounded-2xl hover:border-blue-500/20 transition-colors">
                <h4 className="text-white font-bold mb-2 flex items-center gap-3">
                  <span className="text-blue-400 font-black text-xl">Q</span>
                  Apakah aman digunakan?
                </h4>
                <p className="text-slate-400 text-sm ml-7 lg:ml-8 leading-relaxed">
                  Sangat aman. Kami tidak menyimpan riwayat unduhan Anda di
                  server kami.
                </p>
              </div>
            </div>
          </div>

          <AdBanner className="mb-4 lg:mb-8" />
          <div className="flex-1" />
        </div>
      </div>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="relative z-10 w-full px-6 md:px-8 lg:px-12 fade-in-up">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/[0.06] py-6 lg:py-8">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p className="text-slate-400 text-xs lg:text-sm font-semibold tracking-wide flex items-center gap-2">
              <span className="text-white">NEXA Downloader</span> &middot;
              <span className="text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                Solo Dev Project
              </span>
            </p>
            <p className="text-slate-500 text-[10px] lg:text-xs">
              Proudly designed and engineered independently.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="NEXA"
              className="w-7 h-7 lg:w-9 lg:h-9 rounded-xl object-cover opacity-80 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            />
          </div>
        </div>
      </footer>

      {/* ============================================================
          FLOATING ACTION BUTTON (REPORT ISSUE)
          ============================================================ */}
      <button
        onClick={() => setShowContactModal(true)}
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-40 flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-tr from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-full shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:-translate-y-1 transition-all duration-300 group"
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
        <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg shadow-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap hidden md:block">
          Pusat Bantuan &amp; Laporan
        </span>
      </button>

      {/* ============================================================
          CONTACT MODAL (WHATSAPP & DIRECT CHAT)
          ============================================================ */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0b1121] border border-blue-500/20 rounded-3xl p-6 lg:p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>

            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
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

            <h3 className="text-2xl font-bold text-white mb-2 text-glow">
              Hubungi Kami
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Punya kendala saat mengunduh? Hubungi admin NEXA secara langsung
              melalui opsi di bawah ini.
            </p>

            <a
              href="https://wa.me/6282216631335?text=Halo%20Admin%20NEXA,%20saya%20mengalami%20kendala%20saat%20menggunakan%20Downloader.%20Bisa%20bantu%20saya?"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mb-6 py-3.5 px-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-bold rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_0_15px_rgba(37,211,102,0.1)] hover:shadow-[0_0_25px_rgba(37,211,102,0.2)] hover:-translate-y-0.5"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat via WhatsApp
            </a>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Atau via Email
              </span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            {contactFormStatus === "success" ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 text-center fade-in-up">
                <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
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
                <h4 className="text-green-400 font-bold mb-1">
                  Pesan Terkirim!
                </h4>
                <p className="text-slate-400 text-sm">
                  Terima kasih atas laporan Anda. Admin kami akan segera
                  mengeceknya.
                </p>
                <button
                  onClick={() => setContactFormStatus("idle")}
                  className="mt-4 text-slate-500 hover:text-white text-sm font-semibold transition-colors"
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
                    Email Anda
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="nama@email.com"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1.5 ml-1">
                    Kendala / Pesan
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={3}
                    placeholder="Ceritakan kendala yang Anda alami..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={contactFormStatus === "sending"}
                  className="w-full py-3.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
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
                    "Kirim Pesan"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Merge Alert Modal */}
      {mergeAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-blue-500/30 p-6 lg:p-8 rounded-2xl max-w-md w-full shadow-[0_0_40px_rgba(59,130,246,0.15)] text-center relative">
            {mergeAlert.status === "done" ? (
              <div className="w-16 h-16 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mx-auto mb-5 border border-green-500/20">
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
              <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-500/20">
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
              <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-500/20">
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

            <h3 className="text-xl font-bold text-white mb-2">
              {mergeAlert.status === "processing_subtitle" ? "Mengunduh Subtitle..." :
               mergeAlert.status === "fake_animating"
              ? "Menyiapkan File..."
              : mergeAlert.status === "merging"
              ? (mergeAlert.filename.endsWith(".mp3") ? "Mengonversi ke MP3..." : "Menggabungkan Video & Audio...")
              : mergeAlert.status === "done"
              ? "Selesai!"
              : mergeAlert.status === "error"
                  ? "Terjadi Kesalahan"
                  : (mergeAlert.filename.endsWith(".mp3") ? "Mengunduh Audio..." : "Mengunduh ke Server...")}
            </h3>

            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              {mergeAlert.status === "done" ? (
                "File Anda sudah siap dan sedang diunduh oleh browser."
              ) : mergeAlert.status === "error" ? (
                "Gagal memproses video ini di server. Silakan coba kualitas lain."
              ) : mergeAlert.status === "fake_animating" ? (
                "File sudah di-cache oleh server. Mempersiapkan unduhan Anda..."
              ) : (
                <>
                  Harap{" "}
                  <span className="text-red-400 font-bold">JANGAN MENUTUP</span>{" "}
                  halaman ini. Unduhan otomatis dimulai saat mencapai 100%.
                </>
              )}
            </p>

            {/* Progress Bar */}
            {mergeAlert.status !== "done" && mergeAlert.status !== "error" && (
              <div className="w-full bg-slate-800 rounded-full h-3 mb-2 overflow-hidden border border-white/[0.05]">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, mergeAlert.percent))}%`,
                  }}
                ></div>
              </div>
            )}
            {mergeAlert.status !== "done" && mergeAlert.status !== "error" && (
              <div className="text-xs font-bold text-blue-400 mb-6">
                {Math.round(mergeAlert.percent)}% Selesai
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
                  ? "bg-green-600 hover:bg-green-500"
                  : mergeAlert.status === "error"
                    ? "bg-slate-700 hover:bg-slate-600"
                    : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              }`}
            >
              {mergeAlert.status === "done" || mergeAlert.status === "error"
                ? "Tutup"
                : "Sembunyikan"}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          FLOATING ACTION BUTTON (HISTORY)
          ============================================================ */}
      <button
        onClick={() => setShowHistory(true)}
        className="fixed bottom-24 right-6 lg:bottom-32 lg:right-10 z-40 flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 bg-white/[0.05] border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-full shadow-lg hover:-translate-y-1 transition-all duration-300 group backdrop-blur-md"
      >
        <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg shadow-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap hidden md:block">
          Riwayat Unduhan
        </span>
      </button>

      {/* ============================================================
          HISTORY DRAWER
          ============================================================ */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0b1121] border border-white/10 rounded-3xl p-6 lg:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowHistory(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1 text-glow">Riwayat Unduhan</h3>
                <p className="text-slate-400 text-sm">15 unduhan terakhir yang Anda lakukan.</p>
              </div>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg border border-red-500/20 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus Semua
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-500">Belum ada riwayat unduhan.</p>
                </div>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between gap-4 p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-colors group relative cursor-pointer" onClick={() => { setUrl(h.original_url); setShowHistory(false); }}>
                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                      <div className="w-20 h-16 shrink-0 bg-black/40 rounded-lg overflow-hidden border border-white/10">
                        <img src={h.thumbnail || '/logo.png'} alt="Thumb" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex flex-col justify-center overflow-hidden">
                        <h4 className="text-white font-bold text-sm truncate mb-1 max-w-[200px] lg:max-w-[250px]">{h.title || 'Video'}</h4>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-blue-400 uppercase font-black tracking-wider text-[10px] bg-blue-500/10 px-2 py-0.5 rounded">{h.platform}</span>
                          <span className="text-slate-500">{new Date(h.timestamp).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteHistoryItem(h.id, e)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                      title="Hapus riwayat ini"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
