import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — NEXA Downloader",
  description: "Syarat dan Ketentuan penggunaan layanan NEXA Downloader.",
};

export default function TermsPage() {
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
            Syarat &amp; Ketentuan
          </h1>
          <p className="text-slate-400 text-sm text-center mb-10">
            Terakhir diperbarui: 10 Juni 2026
          </p>

          <div className="space-y-8 text-slate-300 text-sm lg:text-base leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-white mb-3">1. Penerimaan Syarat</h2>
              <p>
                Dengan mengakses dan menggunakan NEXA Downloader (&quot;Layanan&quot;), 
                Anda menyetujui dan terikat oleh Syarat &amp; Ketentuan ini. 
                Jika Anda tidak setuju, harap berhenti menggunakan Layanan kami.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">2. Deskripsi Layanan</h2>
              <p>
                NEXA Downloader adalah alat daring yang memungkinkan pengguna mengunduh konten media 
                (video, audio, gambar) dari berbagai platform media sosial. 
                Layanan ini disediakan secara gratis dan &quot;sebagaimana adanya&quot; (as-is).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">3. Penggunaan yang Diperbolehkan</h2>
              <p>Anda diperbolehkan menggunakan Layanan kami untuk:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Mengunduh konten yang Anda miliki atau Anda buat sendiri</li>
                <li>Mengunduh konten yang bersifat publik dan bebas hak cipta</li>
                <li>Penggunaan pribadi dan non-komersial</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">4. Penggunaan yang Dilarang</h2>
              <p>Anda <strong>dilarang</strong> menggunakan Layanan kami untuk:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Mengunduh konten yang melanggar hak cipta pihak ketiga tanpa izin</li>
                <li>Mendistribusikan ulang konten yang diunduh untuk tujuan komersial</li>
                <li>Melakukan serangan DDoS, spam, atau penyalahgunaan lainnya terhadap server kami</li>
                <li>Menggunakan bot atau otomatisasi untuk mengakses Layanan secara berlebihan</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">5. Hak Kekayaan Intelektual</h2>
              <p>
                NEXA Downloader tidak menyimpan, menghosting, atau memiliki konten media yang diunduh melalui Layanan kami. 
                Semua konten yang diakses melalui Layanan ini merupakan milik platform dan pembuat konten aslinya. 
                Pengguna bertanggung jawab penuh atas penggunaan konten yang diunduh.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">6. Batasan Tanggung Jawab</h2>
              <p>
                NEXA Downloader disediakan &quot;sebagaimana adanya&quot; tanpa jaminan apa pun. 
                Kami tidak bertanggung jawab atas:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Ketersediaan atau keandalan Layanan secara terus-menerus</li>
                <li>Kerugian yang timbul dari penggunaan atau ketidakmampuan menggunakan Layanan</li>
                <li>Pelanggaran hak cipta yang dilakukan oleh pengguna</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">7. Perubahan Layanan</h2>
              <p>
                Kami berhak mengubah, menangguhkan, atau menghentikan Layanan kapan saja tanpa pemberitahuan sebelumnya. 
                Kami juga berhak memperbarui Syarat &amp; Ketentuan ini sewaktu-waktu.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">8. Hubungi Kami</h2>
              <p>
                Jika Anda memiliki pertanyaan mengenai Syarat &amp; Ketentuan ini, 
                silakan hubungi kami melalui formulir kontak yang tersedia di halaman utama NEXA Downloader.
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
