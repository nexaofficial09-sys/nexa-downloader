"use client";
import React, { useState, useEffect } from "react";

type Language = "id" | "en";

const translations = {
  id: {
    title: "Syarat & Ketentuan",
    lastUpdated: "Terakhir diperbarui: 10 Juni 2026",
    back: "← Kembali",
    section1: "1. Penerimaan Syarat",
    p1: "Dengan mengakses dan menggunakan NEXA Downloader (\"Layanan\"), Anda menyetujui dan terikat oleh Syarat & Ketentuan ini. Jika Anda tidak setuju, harap berhenti menggunakan Layanan kami.",
    section2: "2. Deskripsi Layanan",
    p2: "NEXA Downloader adalah alat daring yang memungkinkan pengguna mengunduh konten media (video, audio, gambar) dari berbagai platform media sosial. Layanan ini disediakan secara gratis dan \"sebagaimana adanya\" (as-is).",
    section3: "3. Penggunaan yang Diperbolehkan",
    p3: "Anda diperbolehkan menggunakan Layanan kami untuk:",
    l3_1: "Mengunduh konten yang Anda miliki atau Anda buat sendiri",
    l3_2: "Mengunduh konten yang bersifat publik dan bebas hak cipta",
    l3_3: "Penggunaan pribadi dan non-komersial",
    section4: "4. Penggunaan yang Dilarang",
    p4: "Anda dilarang menggunakan Layanan kami untuk:",
    l4_1: "Mengunduh konten yang melanggar hak cipta pihak ketiga tanpa izin",
    l4_2: "Mendistribusikan ulang konten yang diunduh untuk tujuan komersial",
    l4_3: "Melakukan serangan DDoS, spam, atau penyalahgunaan lainnya terhadap server kami",
    l4_4: "Menggunakan bot atau otomatisasi untuk mengakses Layanan secara berlebihan",
    section5: "5. Hak Kekayaan Intelektual",
    p5: "NEXA Downloader tidak menyimpan, menghosting, atau memiliki konten media yang diunduh melalui Layanan kami. Semua konten yang diakses melalui Layanan ini merupakan milik platform dan pembuat konten aslinya. Pengguna bertanggung jawab penuh atas penggunaan konten yang diunduh.",
    section6: "6. Batasan Tanggung Jawab",
    p6: "NEXA Downloader disediakan \"sebagaimana adanya\" tanpa jaminan apa pun. Kami tidak bertanggung jawab atas:",
    l6_1: "Ketersediaan atau keandalan Layanan secara terus-menerus",
    l6_2: "Kerugian yang timbul dari penggunaan atau ketidakmampuan menggunakan Layanan",
    l6_3: "Pelanggaran hak cipta yang dilakukan oleh pengguna",
    section7: "7. Perubahan Layanan",
    p7: "Kami berhak mengubah, menangguhkan, atau menghentikan Layanan kapan saja tanpa pemberitahuan sebelumnya. Kami juga berhak memperbarui Syarat & Ketentuan ini sewaktu-waktu.",
    section8: "8. Hubungi Kami",
    p8: "Jika Anda memiliki pertanyaan mengenai Syarat & Ketentuan ini, silakan hubungi kami melalui formulir kontak yang tersedia di halaman utama NEXA Downloader.",
    footer: "© 2026 NEXA Downloader. All rights reserved."
  },
  en: {
    title: "Terms & Conditions",
    lastUpdated: "Last updated: June 10, 2026",
    back: "← Back",
    section1: "1. Acceptance of Terms",
    p1: "By accessing and using NEXA Downloader (\"Service\"), you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, please discontinue use of our Service immediately.",
    section2: "2. Description of Service",
    p2: "NEXA Downloader is an online utility that allows users to download media content (videos, audio, images) from various social media platforms. The Service is provided free of charge and on an \"as-is\" basis.",
    section3: "3. Permitted Use",
    p3: "You are permitted to use our Service to:",
    l3_1: "Download content that you own or have created yourself",
    l3_2: "Download content that is public domain and free of copyright restrictions",
    l3_3: "Engage in personal and strictly non-commercial use",
    section4: "4. Prohibited Use",
    p4: "You are strictly prohibited from using our Service to:",
    l4_1: "Download third-party copyrighted content without explicit permission",
    l4_2: "Redistribute downloaded content for commercial purposes or financial gain",
    l4_3: "Perform DDoS attacks, spamming, or any other abusive actions against our servers",
    l4_4: "Use bots or automation to excessively access the Service",
    section5: "5. Intellectual Property Rights",
    p5: "NEXA Downloader does not store, host, or claim ownership of any media content downloaded through our Service. All content accessed via this Service belongs to the respective platforms and original creators. Users bear sole responsibility for the use of downloaded content.",
    section6: "6. Limitation of Liability",
    p6: "NEXA Downloader is provided \"as is\" without any warranties of any kind. We are not liable for:",
    l6_1: "The continuous availability or absolute reliability of the Service",
    l6_2: "Any loss or damage arising from the use or inability to use the Service",
    l6_3: "Copyright infringements committed by users",
    section7: "7. Modifications to the Service",
    p7: "We reserve the right to modify, suspend, or discontinue the Service at any time without prior notice. We also reserve the right to update these Terms & Conditions at our discretion.",
    section8: "8. Contact Us",
    p8: "If you have any questions or concerns regarding these Terms & Conditions, please reach out to us via the contact form provided on the NEXA Downloader homepage.",
    footer: "© 2026 NEXA Downloader. All rights reserved."
  }
};

export default function TermsPage() {
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
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section3}</h2>
              <p>{t.p3}</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500">
                <li>{t.l3_1}</li>
                <li>{t.l3_2}</li>
                <li>{t.l3_3}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section4}</h2>
              <p>{t.p4}</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500">
                <li>{t.l4_1}</li>
                <li>{t.l4_2}</li>
                <li>{t.l4_3}</li>
                <li>{t.l4_4}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section5}</h2>
              <p>{t.p5}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section6}</h2>
              <p>{t.p6}</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500">
                <li>{t.l6_1}</li>
                <li>{t.l6_2}</li>
                <li>{t.l6_3}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section7}</h2>
              <p>{t.p7}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{t.section8}</h2>
              <p>{t.p8}</p>
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
