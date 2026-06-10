import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — NEXA Downloader",
  description: "Kebijakan Privasi NEXA Downloader. Kami menghormati privasi pengguna dan tidak menyimpan data pribadi.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col">
      {/* Background blobs */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[400px] lg:w-[700px] h-[300px] lg:h-[500px] bg-blue-600/[0.07] rounded-full filter blur-[100px] lg:blur-[140px] animate-blob pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-20 w-full px-6 md:px-8 lg:px-12 py-4 lg:py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 lg:gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="NEXA Logo" className="w-8 h-8 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl object-cover shadow-lg shadow-blue-500/15" />
            <span className="text-base lg:text-xl font-black text-white tracking-tight">
              NEXA<span className="text-blue-400">.</span>
            </span>
          </a>
          <a href="/" className="text-sm text-slate-400 hover:text-white transition-colors font-semibold">
            ← Kembali
          </a>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 md:px-8 lg:px-12 pb-16">
        <div className="w-full max-w-3xl">
          <h1 className="text-3xl lg:text-4xl font-black text-white mb-2 text-center">
            Kebijakan Privasi
          </h1>
          <p className="text-slate-400 text-sm text-center mb-10">
            Terakhir diperbarui: 10 Juni 2026
          </p>

          <div className="space-y-8 text-slate-300 text-sm lg:text-base leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-white mb-3">1. Informasi yang Kami Kumpulkan</h2>
              <p>
                NEXA Downloader <strong>tidak mengumpulkan, menyimpan, atau membagikan data pribadi pengguna</strong>. 
                Kami tidak memerlukan registrasi akun, tidak menyimpan riwayat unduhan di server, dan tidak menggunakan cookie pelacakan.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">2. Data yang Diproses Secara Otomatis</h2>
              <p>Saat Anda menggunakan layanan kami, data berikut diproses secara sementara dan <strong>tidak disimpan secara permanen</strong>:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>URL media yang Anda masukkan (hanya diproses untuk ekstraksi, tidak disimpan)</li>
                <li>Alamat IP (hanya untuk pembatasan laju/rate limiting, tidak dicatat)</li>
                <li>Statistik agregat penggunaan platform (hanya jumlah total unduhan per platform, tanpa data pribadi)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">3. Penggunaan Cookie</h2>
              <p>
                Website kami hanya menggunakan cookie fungsional yang diperlukan untuk operasi dasar website (seperti penyimpanan riwayat lokal di browser Anda). 
                Kami <strong>tidak menggunakan cookie pelacakan pihak ketiga</strong> untuk tujuan periklanan atau analitik.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">4. Layanan Pihak Ketiga</h2>
              <p>
                Kami dapat menggunakan layanan pihak ketiga berikut:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li><strong>Google AdSense</strong> — untuk menampilkan iklan yang relevan. Google mungkin menggunakan cookie sendiri sesuai dengan Kebijakan Privasi Google.</li>
                <li><strong>Vercel</strong> — sebagai penyedia hosting frontend.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">5. Keamanan Data</h2>
              <p>
                Seluruh komunikasi antara browser Anda dan server kami dienkripsi menggunakan protokol HTTPS/TLS. 
                File media yang diproses di server kami dihapus secara otomatis dalam waktu maksimal 2 jam.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">6. Hak Pengguna</h2>
              <p>
                Karena kami tidak menyimpan data pribadi, tidak ada data yang perlu dihapus atau diminta. 
                Jika Anda memiliki pertanyaan tentang privasi, silakan hubungi kami melalui formulir kontak di halaman utama.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">7. Perubahan Kebijakan</h2>
              <p>
                Kami berhak memperbarui Kebijakan Privasi ini sewaktu-waktu. 
                Perubahan akan berlaku segera setelah dipublikasikan di halaman ini.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 md:px-8 lg:px-12">
        <div className="max-w-4xl mx-auto border-t border-white/[0.06] py-6 text-center">
          <p className="text-slate-500 text-xs">© 2026 NEXA Downloader. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
