# SI-MBG — Evaluasi Kelayakan Gizi Menu MBG (Fuzzy Sugeno)

Aplikasi web untuk menilai kelayakan gizi satu porsi menu Makan Bergizi Gratis dengan Fuzzy Sugeno orde nol dua tahap (9 + 27 aturan). Satu peran (pengguna), tanpa login.

> Alat bantu keputusan, bukan penilaian atau sertifikasi resmi program MBG.

## Menjalankan di komputer sendiri

Butuh Node.js 24 atau lebih baru.

```bash
npm install                 # .npmrc mematikan install script; better-sqlite3 memakai binary prebuilt
cp .env.example .env        # lalu isi APP_KEY: node ace generate:key
node ace migration:run
node ace db:seed            # parameter Default PRD, 70 bahan TKPI, 8 menu uji demo
npm run dev                 # http://localhost:3333
```

Basis data SQLite tersimpan di `tmp/db.sqlite3`.

## Pengujian

```bash
npm test                    # semua suite (unit + functional)
node ace test unit          # mesin fuzzy saja
```

Kasus uji pertama adalah contoh hitung PRD: kalori 95%, protein 80%, lemak 120%, serat 55% → skor kecukupan 89 → skor akhir **55** (Perlu Perbaikan), dengan alasan "lemak berlebih" dan "serat masih di bawah target". Functional test memakai `tmp/test.sqlite3` di port 3334, jadi bisa dijalankan sambil dev server hidup.

## Struktur penting

| Lokasi | Isi |
|---|---|
| `app/fuzzy/` | Mesin Fuzzy Sugeno, TypeScript murni tanpa dependensi Adonis. Dipakai server **dan** browser (simulasi). |
| `app/fuzzy/default_config.ts` | Semua angka dari PRD: himpunan, 36 aturan, kategori, AKG. |
| `app/fuzzy/config_validator.ts` | Pemeriksaan parameter: urutan a ≤ b ≤ c ≤ d, celah cakupan (Σα = 0), konstanta 0–100. |
| `app/services/` | Konversi ke % target, simpan evaluasi, hitung bahan, uji pakar, CSV. |
| `app/controllers/` | Evaluasi, riwayat, bahan, menu mingguan, parameter, uji pakar, tentang. |
| `resources/views/` | Halaman Edge; komponen hasil di `components/evaluation/`. |
| `resources/js/app.js` | Komponen Alpine: form, simulasi, pratinjau grafik parameter. |
| `database/data/` | `tkpi_subset.csv` (bahan) dan `menu_uji_contoh.csv` (menu uji demo). |
| `tests/` | Unit test mesin dan functional test rute. |

## Fitur

| ID | Fitur | Halaman |
|---|---|---|
| F-01–F-03 | Form input, validasi (koma desimal diterima), hitung dua tahap | `/` |
| F-04–F-06 | Skor, kategori, alasan + saran, langkah hitung lengkap, grafik keanggotaan | `/evaluasi/:uuid` |
| F-07 | Hitung dari bahan TKPI (+ bahan kustom, tanda "tidak ada data serat") | `/`, `/bahan` |
| F-08 | Riwayat global dengan filter, hapus hanya dari perangkat pembuat | `/riwayat` |
| F-09, F-10 | Set parameter berversi, Default PRD terkunci, impor/ekspor JSON, kelompok sasaran | `/parameter` |
| F-11 | Bandingkan menu dan rencana menu mingguan | `/bandingkan`, `/mingguan` |
| F-12 | Ekspor CSV dan versi cetak/PDF | tombol di halaman hasil |
| F-13 | Simulasi "bagaimana jika" dengan slider | halaman hasil |
| F-14 | Uji kesesuaian pakar: % kesesuaian + confusion matrix | `/uji-pakar` |
| F-15, F-16 | Halaman metode, tabel aturan yang aktif | `/tentang`, halaman hasil |
| API | `POST /api/evaluasi` (JSON, tanpa simpan) | — |

## Tanpa login: pengamannya

- Setiap evaluasi menyimpan **salinan parameter** yang dipakai, sehingga riwayat lama tetap bisa dijelaskan walaupun parameter diubah.
- Set **Default PRD** terkunci; perubahan selalu dilakukan di salinan, dan ada tombol "Kembali ke Default PRD".
- `PARAMETERS_READONLY=true` di `.env` mengunci halaman parameter (disarankan untuk deployment publik saat demo).
- Hapus evaluasi, rencana, atau bahan kustom hanya bisa dari perangkat pembuatnya (cookie UUID anonim, bukan data pribadi).
- Rate limit 30 permintaan tulis per menit per IP, dan CSRF aktif.

## Deploy

```bash
node ace build
cd build
npm ci --omit=dev
node ace migration:run --force
node ace db:seed
node bin/server.js
```

Variabel lingkungan: `NODE_ENV=production`, `APP_KEY`, `APP_URL`, `HOST=0.0.0.0`, `PORT`, `SESSION_DRIVER=cookie`, `DB_FILE`, `PARAMETERS_READONLY`, `LIMITER_STORE=memory`. Di hosting seperti Railway, Render, atau Fly, pasang volume persisten untuk folder `tmp/` agar SQLite tidak hilang saat redeploy.

## Yang wajib diverifikasi sebelum laporan

- **AKG** di `app/fuzzy/default_config.ts` ditulis dari ingatan berdasarkan Permenkes No. 28/2019, jadi harus dicek ke dokumen asli.
- **Data TKPI** di `database/data/tkpi_subset.csv` berisi angka perkiraan; cocokkan dengan TKPI terbaru.
- **Menu uji** hasil seeder adalah data DEMO, bukan penilaian pakar. Hapus dari `/uji-pakar` lalu impor penilaian pakar yang asli.

## Sumber gambar

- `public/images/logo-bgn.png`: logo Badan Gizi Nasional dari bgn.go.id, dipakai sebagai identitas program. Aplikasi ini tidak berafiliasi dengan BGN, dan pernyataan itu tampil di bar atas dan footer.
- `public/images/presiden.png` dan `public/images/wapres.png`: foto resmi 2024 Presiden Prabowo Subianto dan Wakil Presiden Gibran Rakabuming Raka (Darwis Triadi & Kementerian Sekretariat Negara, **domain publik**) dari [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Prabowo_Subianto_2024_official_portrait.jpg) ([Gibran](https://commons.wikimedia.org/wiki/File:Gibran_Rakabuming_2024_official_portrait.jpg)). Latar belakangnya dihapus dengan `rembg`.
