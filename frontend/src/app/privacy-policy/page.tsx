"use client";
import React, { useState, useEffect } from "react";

type Language = "id" | "en";

const translations = {
  id: {
    title: "Kebijakan Privasi",
    lastUpdated: "Terakhir diperbarui: 10 Juni 2026",
    back: "← Kembali",
    section1: "1. Informasi yang Kami Kumpulkan",
    p1: "NEXA Downloader tidak mengumpulkan, menyimpan, atau membagikan data pribadi pengguna. Kami tidak memerlukan registrasi akun, tidak menyimpan riwayat unduhan di server, dan tidak menggunakan cookie pelacakan.",
    section2: "2. Data yang Diproses Secara Otomatis",
    p2: "Saat Anda menggunakan layanan kami, data berikut diproses secara sementara dan tidak disimpan secara permanen:",
    l2_1: "URL media yang Anda masukkan (hanya diproses untuk ekstraksi, tidak disimpan)",
    l2_2: "Alamat IP (hanya untuk pembatasan laju/rate limiting, tidak dicatat)",
    l2_3: "Statistik agregat penggunaan platform (hanya jumlah total unduhan per platform, tanpa data pribadi)",
    section3: "3. Penggunaan Cookie",
    p3: "Website kami hanya menggunakan cookie fungsional yang diperlukan untuk operasi dasar website (seperti penyimpanan riwayat lokal di browser Anda). Kami tidak menggunakan cookie pelacakan pihak ketiga untuk tujuan periklanan atau analitik.",
    section4: "4. Layanan Pihak Ketiga",
    p4: "Kami dapat menggunakan layanan pihak ketiga berikut:",
    l4_1: "Google AdSense — untuk menampilkan iklan yang relevan. Google mungkin menggunakan cookie sendiri sesuai dengan Kebijakan Privasi Google.",
    l4_2: "Vercel — sebagai penyedia hosting frontend.",
    section5: "5. Keamanan Data",
    p5: "Seluruh komunikasi antara browser Anda dan server kami dienkripsi menggunakan protokol HTTPS/TLS. File media yang diproses di server kami dihapus secara otomatis dalam waktu maksimal 2 jam.",
    section6: "6. Hak Pengguna",
    p6: "Karena kami tidak menyimpan data pribadi, tidak ada data yang perlu dihapus atau diminta. Jika Anda memiliki pertanyaan tentang privasi, silakan hubungi kami melalui formulir kontak di halaman utama.",
    section7: "7. Perubahan Kebijakan",
    p7: "Kami berhak memperbarui Kebijakan Privasi ini sewaktu-waktu. Perubahan akan berlaku segera setelah dipublikasikan di halaman ini.",
    footer: "© 2026 NEXA Downloader. All rights reserved."
  },
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: June 10, 2026",
    back: "← Back",
    section1: "1. Information We Collect",
    p1: "NEXA Downloader does not collect, store, or share users' personal data. We do not require account registration, do not keep download histories on our servers, and do not use tracking cookies.",
    section2: "2. Automatically Processed Data",
    p2: "When you use our service, the following data is processed temporarily and is not stored permanently:",
    l2_1: "The media URL you enter (processed solely for extraction, not saved)",
    l2_2: "IP Address (used strictly for rate limiting, not logged)",
    l2_3: "Aggregated usage statistics (total downloads per platform only, without personal data)",
    section3: "3. Use of Cookies",
    p3: "Our website strictly uses functional cookies necessary for basic website operations (such as saving your local history preferences in your browser). We do not use third-party tracking cookies for advertising or analytics purposes.",
    section4: "4. Third-Party Services",
    p4: "We may utilize the following third-party services:",
    l4_1: "Google AdSense — to serve relevant advertisements. Google may use its own cookies in accordance with Google's Privacy Policy.",
    l4_2: "Vercel — as our frontend hosting provider.",
    section5: "5. Data Security",
    p5: "All communication between your browser and our servers is encrypted using HTTPS/TLS protocols. Media files processed on our servers are automatically deleted within a maximum of 2 hours.",
    section6: "6. User Rights",
    p6: "Because we do not store personal data, there is no data to be deleted or requested. If you have any privacy-related questions, please contact us via the contact form on the homepage.",
    section7: "7. Policy Changes",
    p7: "We reserve the right to update this Privacy Policy at any time. Changes will take effect immediately upon being published on this page.",
    footer: "© 2026 NEXA Downloader. All rights reserved."
  }
};

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState<Language>("id");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem("lang") as Language;
    if (savedLang === "id" || savedLang === "en") {
      setLang(savedLang);
    }
  }, []);

  if (!mounted) return null;
  const t = translations[lang];

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col bg-[#f8f9fa]">
      {/* Background blobs */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[400px] lg:w-[700px] h-[300px] lg:h-[500px] bg-blue-600/[0.07] rounded-full filter blur-[100px] lg:blur-[140px] animate-blob pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-20 w-full px-6 md:px-8 lg:px-12 py-4 lg:py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/logo1.png" alt="NEXA Logo" className="h-8 lg:h-11 w-auto object-contain" />
          </a>
          <a href="/" className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-semibold">
            {t.back}
          </a>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 md:px-8 lg:px-12 pb-16">
        <div className="w-full max-w-3xl">
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-2 text-center">
            {t.title}
          </h1>
          <p className="text-slate-500 text-sm text-center mb-10">
            {t.lastUpdated}
          </p>

          <div className="space-y-8 text-slate-600 text-sm lg:text-base leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section1}</h2>
              <p>{t.p1}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section2}</h2>
              <p>{t.p2}</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500">
                <li>{t.l2_1}</li>
                <li>{t.l2_2}</li>
                <li>{t.l2_3}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section3}</h2>
              <p>{t.p3}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section4}</h2>
              <p>{t.p4}</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500">
                <li><strong>Google AdSense</strong> — {t.l4_1}</li>
                <li><strong>Vercel</strong> — {t.l4_2}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section5}</h2>
              <p>{t.p5}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section6}</h2>
              <p>{t.p6}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section7}</h2>
              <p>{t.p7}</p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 md:px-8 lg:px-12">
        <div className="max-w-4xl mx-auto border-t border-slate-200/60 py-6 text-center">
          <p className="text-slate-500 text-xs">{t.footer}</p>
        </div>
      </footer>
    </main>
  );
}
