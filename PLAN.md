# Rencana Implementasi — SI-MBG (Evaluasi Kelayakan Gizi Menu MBG, Fuzzy Sugeno)

Dokumen ini menerjemahkan PRD ke rencana teknis berbasis **AdonisJS**, dengan dua keputusan yang mengubah PRD:

1. **Hanya satu peran: Pengguna.** Peran "Penyusun menu", "Pengawas", dan "Admin" di PRD digabung. Semua orang boleh mengevaluasi, melihat riwayat, dan mengatur parameter.
2. **Tanpa login.** Butir NFR "halaman admin dilindungi login" diganti dengan pengaman lain (lihat §8).

Bagian yang tidak disebut di sini tetap mengikuti PRD (rumus, himpunan, 36 aturan, kategori, metrik, timeline).

> **Catatan implementasi (16 Okt 2026)**: rencana ini sudah diimplementasikan, dengan beberapa penyesuaian:
> - **AdonisJS 7** (starter kit *hypermedia*), bukan 6. CSS memakai sistem token bawaan starter kit, **bukan Tailwind**.
> - Grafik dibuat sebagai **SVG dari `app/fuzzy/chart.ts`**, tanpa Chart.js, supaya server dan simulasi di browser menggambar dengan fungsi yang sama.
> - AKG, % porsi, dan kelompok sasaran disimpan **di dalam JSON set parameter**, bukan di tabel `target_groups`/`akg_values`. Dengan begitu semuanya ikut tersalin ke snapshot setiap evaluasi dan bisa diekspor/impor dalam satu berkas.
> - Rincian bahan disimpan sebagai kolom JSON `items` di `evaluations`, bukan tabel `evaluation_items`.
> - Struktur aturan (kunci himpunan, 9 + 27 kombinasi) tetap; yang bisa diubah hanya angkanya. Dengan begitu aturan tidak mungkin hilang atau kembar.
> - Cara menjalankan dan daftar fitur: lihat `README.md`.

---

## 1. Tech stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | **AdonisJS 6** (starter kit `web`), TypeScript | Full-stack, MVC, sudah ada validator, ORM, test runner |
| View | **Edge** template + **Alpine.js** untuk interaksi kecil | Server-rendered, ringan, tidak perlu SPA. Cocok untuk halaman form → hasil |
| CSS | **Tailwind CSS** lewat Vite (bawaan Adonis) | Cepat untuk layout responsif 360 px |
| Grafik | **Chart.js** + `chartjs-plugin-annotation` | Kurva trapesium + garis penanda nilai input; cukup sederhana |
| Validasi | **VineJS** (bawaan Adonis) | Validasi di server (NFR keamanan) |
| ORM / DB | **Lucid** + **SQLite** (dev & demo) → opsional **PostgreSQL** saat deploy | SQLite tanpa server, cukup untuk skala tugas kuliah |
| Test | **Japa** (bawaan Adonis) | Unit test mesin fuzzy + functional test route |
| Rate limit | `@adonisjs/limiter` | Pengganti proteksi login untuk endpoint tulis |
| Keamanan | `@adonisjs/shield` (CSRF, header) | Bawaan starter kit |

> Alternatif kalau tim lebih suka komponen: **Inertia + Vue/React** (didukung resmi Adonis). Mesin fuzzy tetap sama, hanya lapisan view yang berubah. Rekomendasi saya tetap Edge + Alpine karena lebih sedikit bagian yang bisa rusak.

**Catatan lingkungan:** folder proyek ada di **OneDrive**. `node_modules` (puluhan ribu file) akan ikut tersinkron dan sering bikin error `EPERM`/lock. Saran: taruh repo di luar OneDrive (mis. `D:\Coding\si-mbg`) dan simpan ke GitHub; atau minimal kecualikan `node_modules` dari sinkronisasi.

---

## 2. Arsitektur

```
Browser (Edge + Alpine + Chart.js)
   │  form POST / fetch JSON
   ▼
Controller Adonis ──► Validator (VineJS) ──► Service ──► Mesin Fuzzy (app/fuzzy, TS murni)
   │                                          │
   │                                          └──► Lucid Model ──► SQLite/PostgreSQL
   ▼
Edge view (hasil, jejak hitung, grafik)
```

Prinsip penting:
- **`app/fuzzy/` tidak boleh import apa pun dari Adonis** (tidak ada model, request, DB). Input: angka + objek konfigurasi. Output: hasil + jejak hitung. Ini yang membuatnya bisa diuji dan dijelaskan.
- Mesin yang sama di-bundle ke browser lewat Vite untuk fitur **simulasi langsung** (slider "coba ubah"). Jadi satu sumber kebenaran untuk server dan klien.
- Setiap evaluasi menyimpan **salinan (snapshot) parameter** yang dipakai. Riwayat lama tetap bisa dijelaskan walaupun parameter kemudian diubah.

---

## 3. Struktur folder

```
si-mbg/
├─ app/
│  ├─ fuzzy/                      # MESIN — TS murni, tanpa dependensi Adonis
│  │  ├─ types.ts                 # Trapezoid, FuzzySet, Variable, Rule, FuzzyConfig, Trace
│  │  ├─ membership.ts            # trapezoid(x, [a,b,c,d]), fuzzify(variable, x)
│  │  ├─ sugeno.ts                # inferStage(rules, memberships) → {rules, Σα, Σαz, z}
│  │  ├─ engine.ts                # evaluate(percentInput, config) → EvaluationResult
│  │  ├─ category.ts              # toCategory(score, thresholds)
│  │  ├─ reasons.ts               # alasan bahasa awam + saran perbaikan
│  │  ├─ config_validator.ts      # cek a≤b≤c≤d, cakupan domain, 9/27 aturan lengkap
│  │  └─ default_config.ts        # semua angka dari PRD
│  ├─ controllers/
│  │  ├─ evaluations_controller.ts
│  │  ├─ history_controller.ts
│  │  ├─ parameters_controller.ts
│  │  ├─ ingredients_controller.ts
│  │  ├─ weekly_plans_controller.ts
│  │  ├─ expert_tests_controller.ts
│  │  └─ exports_controller.ts
│  ├─ services/
│  │  ├─ nutrition_target_service.ts   # AKG kelompok × % porsi → target per porsi
│  │  ├─ evaluation_service.ts         # konversi ke %, panggil engine, simpan
│  │  ├─ ingredient_calculator.ts      # Σ (gram/100 × nilai per 100 g)
│  │  └─ expert_agreement_service.ts   # confusion matrix, % kesesuaian
│  ├─ models/                      # Lucid models (lihat §6)
│  ├─ validators/                  # VineJS schemas
│  └─ middleware/
│     ├─ device_id_middleware.ts   # cookie UUID anonim (lihat §8)
│     └─ parameter_lock_middleware.ts
├─ database/
│  ├─ migrations/
│  ├─ seeders/                     # target_groups, akg, default parameter set, bahan TKPI, menu contoh
│  └─ data/                        # tkpi_subset.csv, menu_uji.csv
├─ resources/
│  ├─ views/
│  │  ├─ layouts/app.edge
│  │  ├─ components/               # input_field, score_badge, membership_chart, trace_table, disclaimer
│  │  └─ pages/                    # home, result, history, parameters, ingredients, weekly, expert, about
│  ├─ js/
│  │  ├─ app.ts
│  │  ├─ charts.ts                 # gambar kurva trapesium + marker
│  │  └─ simulator.ts              # import ../../app/fuzzy/engine untuk simulasi di klien
│  └─ css/app.css
├─ start/routes.ts
├─ tests/
│  ├─ unit/fuzzy/                  # membership, sugeno, engine, category, reasons, config_validator
│  └─ functional/                  # route evaluasi, validasi, riwayat, parameter
└─ PLAN.md
```

---

## 4. Desain mesin fuzzy

### 4.1 Tipe data inti

```ts
type Trapezoid = [number, number, number, number]          // [a, b, c, d]

interface FuzzySet { key: string; label: string; params: Trapezoid }
interface Variable { key: 'kalori'|'protein'|'kecukupan'|'lemak'|'serat'; label: string;
                     domain: [number, number]; sets: FuzzySet[] }

interface Rule { id: string; when: Record<string, string>; output: number }
// contoh: { id: 'R1-5', when: { kalori: 'cukup', protein: 'cukup' }, output: 100 }

interface FuzzyConfig {
  stage1: { inputs: [Variable, Variable]; rules: Rule[] }            // 9 aturan
  stage2: { inputs: [Variable, Variable, Variable]; rules: Rule[] }  // 27 aturan
  categories: { key: string; label: string; min: number }[]          // 0, 40, 65, 85
  outputConstants: Record<string, number>                            // TL 20, PP 50, L 75, SL 95
}
```

### 4.2 Fungsi keanggotaan (perhatikan kasus tepi)

```ts
export function trapezoid(x: number, [a, b, c, d]: Trapezoid): number {
  if (x >= b && x <= c) return 1                 // inti — juga menangani bahu a=b atau c=d
  if (x <= a || x >= d) return 0
  if (x < b) return (x - a) / (b - a)            // b > a dijamin karena x>a & x<b
  return (d - x) / (d - c)                       // x > c & x < d → d > c
}
```

- **Bahu kiri** `[0,0,70,90]` di x=0 → masuk cabang inti → 1. ✔
- **Bahu kanan** `[110,130,200,200]` di x=200 → 1. ✔
- Tidak pernah membagi nol, karena cabang pembagian hanya tercapai kalau `a<x<b` atau `c<x<d`.
- **Clipping:** sebelum fuzzifikasi, `x = clamp(x, domain[0], domain[1])` (0–200 untuk %, 0–100 untuk kecukupan). Nilai asli tetap disimpan dan ditampilkan, plus catatan "dipotong ke 200%".

### 4.3 Inferensi dan jejak

`inferStage` menghitung **semua** aturan (termasuk α = 0) supaya tabel jejak lengkap; tampilan bisa memfilter "aturan aktif saja".

```ts
interface RuleTrace { id: string; when: Record<string,string>; memberships: number[]; alpha: number; z: number; alphaZ: number }
interface StageTrace { fuzzified: Record<string, Record<string, number>>; rules: RuleTrace[];
                       sumAlpha: number; sumAlphaZ: number; output: number }
interface EvaluationResult {
  input: { raw: NutritionInput; target: NutritionInput; percent: Percent; clipped: Percent }
  stage1: StageTrace; stage2: StageTrace
  score: number; category: CategoryKey; reasons: Reason[]; suggestions: string[]
}
```

- α = `min(μ…)`, z = `Σαz / Σα`.
- **Pengaman Σα = 0:** dengan parameter default ini mustahil, tapi parameter bisa diedit. Dua lapis: (1) `config_validator` menolak parameter yang meninggalkan celah; (2) kalau tetap terjadi, mesin melempar `FuzzyCoverageError` dengan pesan jelas — **bukan** mengembalikan 0 diam-diam.
- **Pembulatan:** hitung dengan presisi penuh; bulatkan hanya untuk tampilan (2 desimal). Sebelum menentukan kategori, bulatkan ke 6 desimal agar `64.99999999` tidak jatuh ke kategori yang salah.
- **Batas kategori:** `<40` Tidak Layak, `40 ≤ s < 65` Perlu Perbaikan, `65 ≤ s < 85` Layak, `≥85` Sangat Layak. Uji tepat di 40, 65, 85.

### 4.4 Konversi input → persen target

```
target_porsi[n] = AKG_harian[kelompok][n] × persen_porsi (default 30%)
persen[n]       = nilai_input[n] / target_porsi[n] × 100
```

Target per porsi ditampilkan di form ("Target: 495 kkal") supaya pengguna tahu acuannya.

### 4.5 Alasan dan saran (F-04)

Diturunkan dari derajat keanggotaan, bukan dari skor, supaya konsisten dengan jejak:

| Kondisi | Alasan | Saran |
|---|---|---|
| μ(kalori.kurang) ≥ 0,5 | "Energi (kalori) masih di bawah target" | Tambah porsi karbohidrat |
| μ(kalori.berlebih) ≥ 0,5 | "Energi (kalori) berlebih" | Kurangi porsi nasi/gorengan |
| μ(protein.kurang) ≥ 0,5 | "Protein masih di bawah target" | Tambah lauk hewani/nabati (telur, tempe, ikan) |
| μ(protein.tinggi) ≥ 0,5 | "Protein melebihi target" (info, bukan masalah berat) | — |
| μ(lemak.berlebih) ≥ 0,5 | "Lemak berlebih" | Ganti goreng dengan kukus/rebus/panggang |
| μ(lemak.kurang) ≥ 0,5 | "Lemak masih di bawah target" | Tambah sumber lemak sehat |
| μ(serat.cukup) < 1 dan μ(kurang)+μ(sedang) ≥ 0,5 | "Serat masih di bawah target" | Tambah sayur/buah |
| 0 < μ(himpunan bermasalah) < 0,5 | versi ringan: "…mendekati batas" | — |
| Tidak ada masalah | "Kalori, protein, lemak, dan serat sudah seimbang" | — |

Contoh PRD (lemak 0,5/0,5, serat 0,5/0,5) menghasilkan tepat "lemak berlebih" + "serat masih di bawah target". Alasan diurutkan dari yang paling berpengaruh (μ terbesar).

### 4.6 Validasi konfigurasi (dipakai halaman Parameter)

- Tiap trapesium: `domain_min ≤ a ≤ b ≤ c ≤ d ≤ domain_max`, dan `a<b` kecuali `a=b=domain_min` (bahu), serupa untuk `c<d`.
- **Cakupan:** sampel domain tiap 0,1; untuk setiap titik harus ada minimal satu himpunan dengan μ > 0. Kalau gagal, tampilkan rentang celahnya ("celah di 88–92%").
- Aturan tahap 1 = 9 kombinasi unik, tahap 2 = 27 kombinasi unik, semua konstanta 0–100.
- Batas kategori menaik dan dalam 0–100.

---

## 5. Daftar fitur dan halaman

Prioritas mengikuti PRD. Penomoran F tetap, ditambah **F-13 dst.** untuk fitur yang muncul dari keputusan "satu peran, tanpa login" atau yang memperkuat metrik PRD.

### MVP (Gerbang 1, akhir minggu 2)

**F-01 Form input** — `GET /`
- 4 isian: kalori (kkal), protein, lemak, serat (gram) + nama menu (opsional) + kelompok sasaran (default SD 7–9 th sampai F-10 siap).
- Di samping tiap isian: target per porsi dan persen langsung (Alpine, dihitung saat mengetik).
- Tombol **"Isi contoh"**: menu contoh PRD (95/80/120/55%) dan 3–4 menu lain. Penting untuk demo dan uji pengguna 3 menit.
- Terima koma desimal ("12,5") → dinormalisasi ke titik.

**F-02 Validasi** — VineJS di server, atribut HTML di klien
- Wajib diisi, angka ≥ 0.
- Batas keras (ditolak): kalori ≤ 3000 kkal, protein/lemak ≤ 300 g, serat ≤ 100 g per porsi.
- Batas lunak (diterima + peringatan): > 200% target → "nilai dipotong ke 200% dalam perhitungan".
- Semua 0 → ditolak ("isi minimal satu kandungan").
- Pesan galat Bahasa Indonesia di bawah isian, nilai lama tetap terisi (flash old input).

**F-03 Perhitungan** — `POST /evaluasi`
- Service: ambil parameter aktif → hitung target → persen → `engine.evaluate()` → simpan evaluasi + jejak + snapshot → redirect `GET /evaluasi/:id`.
- Endpoint JSON `POST /api/evaluasi` (tanpa simpan) untuk simulasi dan pengujian.

**F-04 Halaman hasil** — `GET /evaluasi/:id`
- Skor besar + kategori berwarna (merah/oranye/hijau/hijau tua) + ikon, bukan warna saja (aksesibilitas).
- Daftar alasan + saran.
- **Pernyataan wajib:** "Hasil ini alat bantu keputusan, bukan penilaian atau sertifikasi resmi program MBG."
- Tombol: Evaluasi lagi, Ubah input (form terisi), Salin tautan, Cetak/PDF, Unduh CSV.

**F-05 Langkah hitung** — bagian bisa dilipat di halaman hasil
1. Konversi: nilai → target → persen (+ catatan clipping).
2. Fuzzifikasi tahap 1: tabel μ tiap himpunan kalori & protein, dengan rumus yang dipakai ("(85 − 80) / (85 − 60) = 0,2").
3. Tabel 9 aturan tahap 1: α, z, α·z; aturan aktif disorot; toggle "tampilkan semua".
4. Σα, Σα·z, skor kecukupan.
5. Sama untuk tahap 2 (27 aturan).
6. Skor akhir + kategori + batas kategori.

Rumus per baris dibuat oleh mesin (bukan view) supaya teksnya sama di hasil, riwayat, dan ekspor.

**F-06 Grafik keanggotaan**
- 5 grafik (kalori, protein, kecukupan, lemak, serat); tiap grafik semua himpunan + garis vertikal di nilai input + titik potong dengan label μ.
- Responsif: grid 1 kolom di HP, 2–3 kolom di laptop.

### Tambahan (minggu 3–4)

**F-07 Pilih bahan dari TKPI** — tab "Hitung dari bahan" di form
- Cari bahan (autocomplete), isi gram, tambah baris; total kalori/protein/lemak/serat dihitung otomatis lalu mengisi form.
- Nilai TKPI per 100 g BDD; rumus `gram / 100 × nilai`.
- Bahan tanpa data serat diberi tanda ⚠ dan dianggap 0, dengan peringatan di hasil ("serat mungkin lebih tinggi").
- Minyak goreng tersedia sebagai bahan (mitigasi risiko lemak dari cara masak).
- **Bahan buatan pengguna:** CRUD bahan sendiri (karena tidak ada admin), ditandai "kustom" agar terbedakan dari data TKPI resmi. Data TKPI hasil seeder tidak bisa diedit/dihapus.
- Simpan komposisi bahan di evaluasi agar bisa dibuka ulang.

**F-08 Riwayat** — `GET /riwayat`
- Daftar global: tanggal, nama menu, kelompok, skor, kategori; cari nama, filter kategori/kelompok/tanggal, urutkan, paginasi 20.
- Detail memakai view yang sama dengan F-04/F-05 dari **jejak tersimpan** (tidak dihitung ulang) — sesuai NFR transparansi.
- Badge "parameter versi lama" kalau snapshot berbeda dari parameter aktif, dengan tombol "Hitung ulang dengan parameter sekarang" (membuat evaluasi baru, yang lama tidak diubah).
- Hapus: lihat §8 (hanya perangkat pembuat; soft delete).
- Filter cepat "Dibuat di perangkat ini".

**F-09 Parameter** — `GET /parameter` (dulu "halaman admin")
- **Set parameter berversi:** "Default PRD" (terkunci, tidak bisa diedit/dihapus) + set buatan pengguna. Satu set aktif.
- Edit: % porsi, AKG per kelompok, titik trapesium (tabel angka + pratinjau grafik langsung), konstanta 36 aturan (grid seperti tabel PRD), batas kategori.
- Simpan → `config_validator`; gagal → pesan per kolom.
- Aksi: Duplikat, Aktifkan, Reset ke default, Ekspor/Impor JSON (berguna untuk kalibrasi bersama pakar dan untuk lampiran laporan).
- Kolom "alasan/rujukan" per titik himpunan dan per aturan — memenuhi kriteria penerimaan "terdokumentasi dengan alasan dan rujukan".
- Sebelum mengaktifkan: tampilkan dampak, mis. "jalankan ulang 25 menu uji: kesesuaian berubah 76% → 84%" (pakai F-14).

**F-10 Kelompok sasaran**
- Seed: SD 7–9 th, SD 10–12 th, SMP 13–15 th, SMA 16–18 th (opsional: balita, ibu hamil/menyusui — MBG juga menyasar mereka; tunda kecuali diminta dosen).
- AKG 10 tahun ke atas berbeda laki-laki/perempuan. Keputusan default: **rata-rata L dan P**, dengan opsi pilih jenis kelamin di form. Catat di laporan.

**F-11 Bandingkan menu mingguan** — `GET /mingguan`
- Buat rencana mingguan (nama, kelompok), isi Senin–Jumat (atau Sabtu) dari riwayat atau evaluasi baru.
- Tabel perbandingan + grafik batang skor per hari + rata-rata minggu + hari terlemah dan alasannya.
- Pilihan ringan: centang 2–5 evaluasi di riwayat → "Bandingkan" (tanpa perlu membuat rencana).

**F-12 Ekspor**
- **PDF:** halaman cetak khusus (`/evaluasi/:id/cetak`) dengan CSS print → pengguna pilih "Simpan sebagai PDF" di browser. Tanpa Puppeteer (berat dan sulit di hosting gratis).
- **CSV:** satu evaluasi (input, persen, μ, α, skor) dan riwayat terfilter (satu baris per evaluasi). Pakai `;` sebagai pemisah dan BOM UTF-8 agar Excel versi Indonesia membukanya benar.

### Fitur baru (dari analisis)

**F-13 Simulasi "bagaimana jika"** — di halaman hasil
- Slider untuk 4 kandungan, skor dan kategori dihitung ulang langsung di browser (mesin yang sama, bundel Vite). Grafik dan alasan ikut berubah.
- Sangat membantu skenario utama PRD: "mengubah menu jika skor rendah" — pengguna langsung lihat butuh tambah berapa gram serat.
- Tombol "Simpan sebagai evaluasi baru".

**F-14 Uji kesesuaian pakar** — `GET /uji-pakar`
- Langsung mendukung metrik PRD "≥ 80% sesuai pakar" dan pekerjaan Anggota 5.
- Input/impor CSV 20–30 menu uji: nama, kalori, protein, lemak, serat, kelompok, kategori menurut pakar, catatan.
- Jalankan dengan set parameter tertentu → tabel (pakar vs sistem, ✔/✘), **% kesesuaian**, **confusion matrix 4×4**, daftar menu yang meleset beserta skornya.
- Bandingkan dua set parameter berdampingan (bantu kalibrasi minggu 4).
- Ekspor CSV untuk laporan.

**F-15 Halaman "Tentang metode"** — `GET /tentang`
- Penjelasan Fuzzy Sugeno dua tahap, tabel himpunan dan aturan **yang aktif** (dibaca dari parameter, bukan teks tetap), rujukan (AKG, PGS, TKPI, juknis MBG), batasan (tidak menilai harga, keamanan pangan, gula/natrium, dll.).
- Berguna untuk penguji dan untuk "setiap anggota bisa menjelaskan alur hitung".

**F-16 Tabel aturan interaktif**
- Heatmap 3×3 (tahap 1) dan 3×3×3 (tahap 2, dipecah per himpunan serat), sel aturan yang aktif pada evaluasi saat ini diberi bobot warna sesuai α.

**F-17 Tautan bagikan**
- Setiap evaluasi punya URL `/evaluasi/:uuid` (UUID, bukan id berurutan, agar tidak mudah ditebak) — pengganti skenario "pengawas membuka riwayat".

---

## 6. Basis data

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `target_groups` | id, code (`sd_7_9`…), name, age_min, age_max, sort | Seed |
| `akg_values` | id, target_group_id, sex (`L`/`P`/`avg`), energy_kcal, protein_g, fat_g, fiber_g, source | Seed dari Permenkes AKG |
| `parameter_sets` | id, name, description, **config (JSON)**, portion_percent, is_default, is_active, is_locked, created_by_device, timestamps | Konfigurasi fuzzy disimpan utuh sebagai JSON tervalidasi → mudah di-snapshot, diekspor, diimpor |
| `ingredients` | id, code, name, category, energy_kcal, protein_g, fat_g, fiber_g (nullable), source (`tkpi`/`custom`), created_by_device | per 100 g BDD |
| `evaluations` | id, **uuid**, menu_name, target_group_id, sex, input_energy, input_protein, input_fat, input_fiber, score_adequacy, score_final, category, **trace (JSON)**, **parameter_snapshot (JSON)**, parameter_set_id, source (`manual`/`ingredients`/`simulation`/`recompute`), device_id, deleted_at, timestamps | Index pada created_at, category |
| `evaluation_items` | id, evaluation_id, ingredient_id, ingredient_name, grams, energy, protein, fat, fiber | Salinan nilai bahan saat itu |
| `weekly_plans` | id, uuid, name, target_group_id, week_start, device_id, timestamps | |
| `weekly_plan_days` | id, weekly_plan_id, day (1–7), evaluation_id | unik (plan, day) |
| `expert_cases` | id, name, energy, protein, fat, fiber, target_group_id, expert_category, expert_name, notes | Menu uji |
| `expert_runs` | id, parameter_set_id, agreement_pct, confusion (JSON), results (JSON), created_at | Riwayat kalibrasi |

Tidak ada tabel `users`. Tidak ada data pribadi; `device_id` adalah UUID acak dari cookie, bukan identitas orang.

---

## 7. Rute

```
GET    /                               form evaluasi (F-01)
POST   /evaluasi                       hitung + simpan (F-03)
GET    /evaluasi/:uuid                 hasil + langkah hitung + grafik (F-04/05/06)
GET    /evaluasi/:uuid/edit            form terisi dari evaluasi
POST   /evaluasi/:uuid/hitung-ulang    evaluasi baru dengan parameter aktif
GET    /evaluasi/:uuid/cetak           versi cetak/PDF (F-12)
GET    /evaluasi/:uuid/csv             CSV satu evaluasi
DELETE /evaluasi/:uuid                 soft delete (pemilik perangkat)
POST   /api/evaluasi                   JSON tanpa simpan (simulasi, test)

GET    /riwayat                        daftar + filter (F-08)
GET    /riwayat/csv                    ekspor terfilter
GET    /bandingkan?ids=..              bandingkan cepat (F-11)

GET    /bahan  /bahan/cari?q=          daftar & autocomplete (F-07)
POST   /bahan  PUT/DELETE /bahan/:id   bahan kustom saja

GET    /mingguan  POST /mingguan  GET /mingguan/:uuid  PUT /mingguan/:uuid/hari/:day

GET    /parameter                      daftar set (F-09)
GET    /parameter/:id                  edit
POST   /parameter                      buat/duplikat
PUT    /parameter/:id                  simpan (validasi)
POST   /parameter/:id/aktifkan
POST   /parameter/reset
GET    /parameter/:id/ekspor  POST /parameter/impor

GET    /uji-pakar  POST /uji-pakar/impor  POST /uji-pakar/jalankan    (F-14)
GET    /tentang                                                        (F-15)
```

---

## 8. Konsekuensi "satu peran, tanpa login" — dan mitigasinya

Tanpa login, siapa pun yang membuka URL publik bisa melakukan apa saja. Risiko yang nyata saat demo: orang lain mengubah parameter aktif atau menghapus riwayat.

| Risiko | Mitigasi |
|---|---|
| Parameter aktif diubah sembarangan | Set **Default PRD** terkunci; edit selalu di set salinan; tombol "Reset ke default"; tiap evaluasi menyimpan snapshot sehingga hasil lama tidak rusak |
| Parameter diubah di deployment publik saat demo | Env `PARAMETERS_READONLY=true` → halaman Parameter jadi baca-saja (middleware `parameter_lock`). Bukan login, cukup saklar deploy |
| Riwayat orang lain dihapus | Cookie `device_id` (UUID acak, httpOnly, 1 tahun). Hapus/edit hanya untuk baris dengan `device_id` sama; soft delete |
| Spam evaluasi / bahan kustom | `@adonisjs/limiter`: mis. 30 POST/menit per IP; batas panjang teks |
| CSRF | Shield bawaan aktif untuk semua form |
| XSS dari nama menu/bahan | Edge escape otomatis (`{{ }}`); jangan pakai `{{{ }}}` untuk input pengguna |
| Cookie hilang (browser lain/incognito) | Terima sebagai batasan; riwayat tetap terlihat, hanya tidak bisa dihapus dari perangkat lain |

Perubahan PRD yang perlu dicatat di laporan: NFR "halaman admin dilindungi login" → "parameter berversi, default terkunci, mode baca-saja lewat konfigurasi deploy".

---

## 9. Data acuan (harus diverifikasi sebelum dikutip)

Seeder awal — **angka dari ingatan, cek ke dokumen asli Permenkes No. 28 Tahun 2019 tentang AKG**:

| Kelompok | Energi (kkal) | Protein (g) | Lemak (g) | Serat (g) |
|---|---|---|---|---|
| 7–9 th | 1650 | 40 | 55 | 23 |
| 10–12 th L / P | 2000 / 1900 | 50 / 55 | 65 / 65 | 28 / 27 |
| 13–15 th L / P | 2400 / 2050 | 70 / 65 | 80 / 70 | 34 / 29 |
| 16–18 th L / P | 2650 / 2100 | 75 / 65 | 85 / 70 | 37 / 29 |

Dengan 30%: SD 7–9 th → target porsi ≈ 495 kkal, 12 g protein, 16,5 g lemak, 6,9 g serat.

Lainnya:
- **% porsi** dari petunjuk teknis MBG (default 30%, bisa diubah di F-09).
- **TKPI:** mulai dari ±100 bahan yang umum di menu MBG (nasi, telur, ayam, tempe, tahu, ikan, sayur, buah, susu, minyak). Simpan sebagai `database/data/tkpi_subset.csv` lalu seeder membacanya.
- **Menu uji:** `database/data/menu_uji.csv`, juga bisa diimpor lewat F-14.
- Tampilkan sumber di halaman Tentang dan di kolom `source`.

---

## 10. Rencana pengujian

### Unit test mesin (`tests/unit/fuzzy`) — toleransi 0,01

1. **Kasus PRD:** kalori 95, protein 80, lemak 120, serat 55 (%) → kecukupan 89, akhir **55**, Perlu Perbaikan, alasan "lemak berlebih" + "serat masih di bawah target". Juga cek nilai α tiap aturan.
2. Trapesium: di a, b, c, d, tengah lereng, bahu kiri/kanan, x < domain, x > domain.
3. Menu ideal (100/100/100/100) → kecukupan 100, akhir 95, Sangat Layak.
4. Semua nol → kecukupan 10, akhir 20, Tidak Layak.
5. Semua 200% → cek hasil (kalori berlebih + protein tinggi = 55; tahap 2 dengan lemak berlebih).
6. Kecukupan Rendah apa pun lemak/serat → 20 (prinsip 1).
7. Lemak Berlebih → skor ≤ 50 (prinsip 2) — **property test**: acak 1000 input, assert selalu benar.
8. Skor akhir selalu dalam [20, 95] dan Σα > 0 untuk 10.000 input acak (property test).
9. Kategori tepat di batas: 39,99 / 40 / 64,99 / 65 / 84,99 / 85.
10. `config_validator`: menolak a>b, celah cakupan, aturan kurang/duplikat; menerima default.
11. Konversi persen dan perhitungan bahan (F-07).

### Functional test (`tests/functional`)
- POST valid → redirect ke hasil; POST tidak valid → kembali dengan pesan galat Bahasa Indonesia.
- Hasil memuat disclaimer.
- Hapus dari device lain → 403.
- `PARAMETERS_READONLY=true` → PUT parameter ditolak.
- Riwayat menampilkan jejak tersimpan, bukan hasil hitung ulang.

### Non-otomatis
- Waktu respons < 1 detik di deployment publik.
- Uji di lebar 360 px (Chrome DevTools + HP asli).
- Uji pengguna 5 orang, tugas: "nilai menu ini dan sebutkan kenapa skornya begitu" ≤ 3 menit.
- Kesesuaian pakar ≥ 80% lewat F-14.

---

## 11. Deployment

- **Rekomendasi:** Railway atau Render (Node + volume untuk SQLite, atau PostgreSQL gratis mereka). Fly.io juga bisa.
- Langkah: `node ace build` → jalankan `build/bin/server.js`; `node ace migration:run --force` dan `node ace db:seed` saat rilis pertama.
- Env: `APP_KEY`, `NODE_ENV=production`, `DB_CONNECTION`, `PARAMETERS_READONLY`, `PORT`, `HOST=0.0.0.0`.
- Cadangan: skrip ekspor DB/JSON parameter sebelum demo (tugas Anggota 3 minggu 5).
- Siapkan **rencana B** demo: jalankan lokal dengan data seed yang sama kalau hosting bermasalah.

---

## 12. Jadwal (disesuaikan dengan PRD)

| Minggu | Target | Rincian teknis |
|---|---|---|
| 1 — Fondasi | Repo, skeleton, mesin dirancang | `npm init adonisjs@latest` (kit web), Tailwind, struktur `app/fuzzy`, tipe & `default_config`, test PRD ditulis dulu (merah), migrasi awal, wireframe |
| 2 — Mesin & MVP | **Gerbang 1: F-01…F-06** | Mesin + seluruh unit test hijau, form + validasi, halaman hasil + disclaimer, langkah hitung, grafik, deploy awal |
| 3 — Data & grafik | F-07, F-10, F-13, F-15 | Seeder AKG & TKPI, kalkulator bahan, kelompok sasaran, simulasi slider, halaman Tentang, uji MVP dengan menu uji |
| 4 — Fitur tambahan | **Gerbang 2: fitur beku** | F-08 riwayat, F-09 parameter + validator, F-14 uji pakar & kalibrasi, F-11, F-12, F-16, F-17 |
| 5 — Penyelesaian | **Gerbang 3: siap demo** | Bug, uji 360 px, rate limit, mode readonly, uji pengguna, laporan & slide, latihan demo |

Kalau waktu kurang, korbankan dengan urutan: F-16 → F-11 → F-12 PDF → F-07 bahan kustom → F-13. **Jangan** korbankan unit test, F-14 (dibutuhkan untuk metrik pakar), dan disclaimer.

### Pembagian tugas (selaras PRD)
- **Anggota 1 (mesin):** `app/fuzzy/*`, semua unit test, `config_validator`, simulasi klien.
- **Anggota 2 (frontend):** view Edge, komponen, grafik Chart.js, slider, responsif.
- **Anggota 3 (backend/DB):** migrasi, model, controller, seeder TKPI/AKG, riwayat, ekspor CSV, limiter, device_id, deploy.
- **Anggota 4 (UI/UX & dokumen):** wireframe, teks antarmuka (alasan, saran, pesan galat), halaman Tentang, cetak/PDF, laporan.
- **Anggota 5 (pakar & QA):** angka AKG/TKPI terverifikasi, menu uji + penilaian pakar, F-14, kalibrasi, uji penerimaan.

---

## 13. Daftar keputusan yang masih perlu ditetapkan

1. **Riwayat global atau per-perangkat?** Rencana ini: global (terlihat semua), hapus hanya oleh perangkat pembuat. Alternatif: per-perangkat saja (lebih privat, tapi pengawas tidak bisa melihat).
2. **AKG 10+ tahun:** rata-rata L/P (default) atau wajib pilih jenis kelamin?
3. **Kelompok sasaran MVP:** hanya SD 7–9 th dulu, atau SD–SMA sejak awal?
4. **% porsi:** 30% dari asumsi atau dari juknis resmi MBG (perlu rujukan)?
5. **Parameter dikunci saat demo publik** (`PARAMETERS_READONLY=true`) — setuju?
6. **SQLite atau PostgreSQL** di deployment — tergantung hosting yang dipilih.
7. **Edge + Alpine atau Inertia + Vue/React** — tergantung kemampuan tim.
8. Ketentuan dosen soal format laporan dan batas waktu (dari PRD).

---

## 14. Definisi selesai (checklist PRD + tambahan)

- [ ] Semua unit test mesin lulus; kasus PRD menghasilkan **55** persis
- [ ] F-01…F-06 bisa didemokan di deployment publik
- [ ] Himpunan & aturan terdokumentasi dengan alasan dan rujukan (kolom alasan di F-09 + halaman Tentang)
- [ ] Kesesuaian pakar diukur pada 20–30 menu (F-14) dan dilaporkan
- [ ] 5 penguji non-teknis menyelesaikan satu evaluasi tanpa bantuan
- [ ] Disclaimer "alat bantu, bukan penilaian resmi" tampil di hasil, cetak, dan ekspor
- [ ] Parameter default terkunci dan bisa di-reset; snapshot tersimpan di tiap evaluasi
- [ ] Nyaman di lebar 360 px; seluruh teks Bahasa Indonesia
- [ ] Laporan & slide selesai; setiap anggota bisa menjelaskan alur hitung
