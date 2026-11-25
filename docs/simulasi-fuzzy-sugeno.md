# Simulasi Mesin Fuzzy Sugeno: dari `fuzzify` sampai `buildReasons`

Dokumen ini menelusuri satu evaluasi menu langkah demi langkah melalui mesin fuzzy di [`app/fuzzy/`](../app/fuzzy/). Untuk setiap fungsi dijelaskan input, proses di dalamnya (termasuk fungsi pembantu yang dipanggil), dan output yang diteruskan ke fungsi berikutnya.

Semua angka di bawah adalah output program yang dijalankan langsung, bukan hitungan tangan. Kasusnya sama dengan kasus uji PRD di [`tests/unit/fuzzy/engine.spec.ts`](../tests/unit/fuzzy/engine.spec.ts).

**Data masukan:** menu untuk SD 7–9 tahun (rata-rata laki-laki/perempuan) berisi 470,25 kkal, protein 9,6 g, lemak 19,8 g, dan serat 3,795 g.

## Daftar isi

- [Peta input dan output](#peta-input-dan-output)
- [Langkah 0: angka mutlak diubah ke persen target](#langkah-0-angka-mutlak-diubah-ke-persen-target)
- [Langkah 1: `fuzzify` kalori dan protein](#langkah-1-fuzzify-kalori-dan-protein)
- [Langkah 2: `inferStage` tahap 1](#langkah-2-inferstage-tahap-1)
- [Langkah 3: skor tahap 1 di-fuzzify ulang](#langkah-3-skor-tahap-1-di-fuzzify-ulang)
- [Langkah 4: `fuzzify` lemak dan serat](#langkah-4-fuzzify-lemak-dan-serat)
- [Langkah 5: `inferStage` tahap 2](#langkah-5-inferstage-tahap-2)
- [Langkah 6: `toCategory`](#langkah-6-tocategory)
- [Langkah 7: `buildReasons`](#langkah-7-buildreasons)
- [Langkah 8: `evaluate` menggabungkan semuanya](#langkah-8-evaluate-menggabungkan-semuanya)

---

## Peta input dan output

| #   | Fungsi                                        | Input                        | Output                                    | Diteruskan ke                                                              |
| --- | --------------------------------------------- | ---------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| 0   | [`toPercent`](../app/fuzzy/targets.ts#L27)    | nilai gizi + target porsi    | `{kalori, protein, lemak, serat}` dalam % | `fuzzify`                                                                  |
| 1   | [`fuzzify`](../app/fuzzy/membership.ts#L33)   | definisi variabel + 1 angka  | `VariableTrace` (μ semua himpunan)        | `inferStage` dan `buildReasons`                                            |
| 2   | [`inferStage`](../app/fuzzy/sugeno.ts#L20)    | `VariableTrace[]` + `Rule[]` | `StageTrace` (α tiap aturan + `output`)   | `output` tahap 1 ke `fuzzify(kecukupan)`; `output` tahap 2 ke `toCategory` |
| 3   | [`toCategory`](../app/fuzzy/category.ts#L8)   | skor + daftar kategori       | 1 objek `Category`                        | `evaluate`                                                                 |
| 4   | [`buildReasons`](../app/fuzzy/reasons.ts#L89) | 4 `VariableTrace`            | `Reason[]`                                | `evaluate`                                                                 |

Singkatnya:

- `fuzzify` mengubah angka menjadi derajat keanggotaan μ.
- `inferStage` mengubah μ menjadi satu skor.
- Skor tahap 1 di-fuzzify lagi untuk tahap 2.
- Skor akhir masuk ke `toCategory`.
- μ dari `fuzzify` masuk ke `buildReasons`.

```
nilai gizi (kkal, gram)
  │  toPercent()
  ▼
% target porsi: kalori, protein, lemak, serat
  │ ── TAHAP 1 ─────────────────────────────────────
  │  fuzzify(kalori), fuzzify(protein)
  │  inferStage(aturan R1–R9)
  ▼
skor kecukupan (0–100)   ← output tahap 1 menjadi INPUT tahap 2
  │ ── TAHAP 2 ─────────────────────────────────────
  │  fuzzify(lemak), fuzzify(kecukupan), fuzzify(serat)
  │  inferStage(aturan S1–S27)
  ▼
skor akhir ─► toCategory()
           └► buildReasons()   (memakai μ dari fuzzify, bukan skor)
```

---

## Langkah 0: angka mutlak diubah ke persen target

- [`portionTarget(config, 'sd_7_9', 'avg')`](../app/fuzzy/targets.ts#L19) menghitung AKG × 30% dan menghasilkan `{kalori: 495, protein: 12, lemak: 16.5, serat: 6.9}`.
- [`toPercent(values, target)`](../app/fuzzy/targets.ts#L27) menghitung `nilai / target × 100` dan menghasilkan `{kalori: 95, protein: 80, lemak: 120, serat: 54.99999999999999}`.

> Serat tidak tepat 55 karena error floating point. Efeknya akan terlihat di [langkah 7](#langkah-7-buildreasons).

Objek ini menjadi input [`evaluate(percent, config)`](../app/fuzzy/engine.ts#L15), yang kemudian memanggil fungsi-fungsi di bawah.

---

## Langkah 1: `fuzzify` kalori dan protein

Pemanggilan: `fuzzify(v.kalori, 95)` di [`membership.ts:33`](../app/fuzzy/membership.ts#L33).

**Input:** definisi variabel kalori (domain `[0, 200]` dan 3 himpunan trapesium) serta angka `95`.

**Apa yang terjadi di dalamnya:**

1. [`clamp(95, [0, 200])`](../app/fuzzy/membership.ts#L28) memaksa nilai masuk ke dalam domain. Hasilnya tetap 95. Kalau inputnya 250, `value` menjadi 200 dan `clipped: true`.
2. [`trapezoidDetail(95, params)`](../app/fuzzy/membership.ts#L11) dipanggil sekali untuk setiap himpunan. Fungsi ini memeriksa 4 kondisi secara **berurutan**:

   ```
   (1) b ≤ x ≤ c          → μ = 1              'inti'
   (2) x ≤ a  atau  x ≥ d → μ = 0              'nol'
   (3) x < b              → μ = (x−a)/(b−a)    'naik'
   (4) selain itu         → μ = (d−x)/(d−c)    'turun'
   ```

   Kondisi `inti` dicek paling awal. Tujuannya agar himpunan bahu seperti `[0,0,70,90]` bernilai 1 di x = 0, dan supaya tidak pernah terjadi pembagian dengan nol.

| Himpunan | [a,b,c,d]         | Kondisi yang terpenuhi | μ     |
| -------- | ----------------- | ---------------------- | ----- |
| kurang   | [0,0,70,90]       | (2) 95 ≥ 90            | **0** |
| cukup    | [70,90,110,130]   | (1) 90 ≤ 95 ≤ 110      | **1** |
| berlebih | [110,130,200,200] | (2) 95 ≤ 110           | **0** |

**Output (`VariableTrace`):**

```json
{
  "variable": "kalori",
  "raw": 95,
  "value": 95,
  "clipped": false,
  "memberships": [
    { "set": "kurang", "params": [0, 0, 70, 90], "mu": 0, "branch": "nol" },
    { "set": "cukup", "params": [70, 90, 110, 130], "mu": 1, "branch": "inti" },
    { "set": "berlebih", "params": [110, 130, 200, 200], "mu": 0, "branch": "nol" }
  ]
}
```

Field `label` sengaja tidak ditampilkan agar ringkas.

Proses yang sama untuk `fuzzify(v.protein, 80)`:

| Himpunan | [a,b,c,d]         | Kondisi          | μ                         |
| -------- | ----------------- | ---------------- | ------------------------- |
| kurang   | [0,0,60,85]       | (4) 60 < 80 < 85 | (85−80)/(85−60) = **0,2** |
| cukup    | [60,85,115,140]   | (3) 80 < 85      | (80−60)/(85−60) = **0,8** |
| tinggi   | [115,140,200,200] | (2) 80 ≤ 115     | **0**                     |

Dua objek ini (`kalori` dan `protein`) menjadi input tahap 1.

---

## Langkah 2: `inferStage` tahap 1

Pemanggilan: `inferStage('tahap 1', [kalori, protein], stage1Rules)` di [`sugeno.ts:20`](../app/fuzzy/sugeno.ts#L20).

**Input:**

- nama tahap (hanya dipakai untuk pesan error),
- array `VariableTrace`,
- 9 aturan, misalnya `{ id: 'R4', when: { kalori: 'cukup', protein: 'kurang' }, output: 45 }`.

**Apa yang terjadi untuk setiap aturan ([baris 21–35](../app/fuzzy/sugeno.ts#L21-L35)), dengan contoh R4:**

1. `inputs.map(...)` mencari μ himpunan yang diminta aturan untuk setiap input:
   - input kalori: `rule.when['kalori']` bernilai `'cukup'`, lalu `muOf(kalori, 'cukup')` memberi **1**.
   - input protein: `rule.when['protein']` bernilai `'kurang'`, lalu `muOf(protein, 'kurang')` memberi **0,2**.
   - [`muOf`](../app/fuzzy/membership.ts#L50) hanya mencari μ di array `memberships` berdasarkan nama himpunan. Kalau tidak ditemukan, hasilnya 0.
   - Hasilnya `memberships = [1, 0.2]`. Urutannya selalu mengikuti urutan array `inputs`.
2. `α = Math.min(1, 0.2) = 0,2`. Ini operator **AND (MIN)**.
3. `z = rule.output = 45`, sehingga `alphaZ = 0,2 × 45 = 9`.

**Hasil ke-9 aturan:**

| Aturan | Kondisi (kalori, protein) | memberships  | α       | z       | α·z    |
| ------ | ------------------------- | ------------ | ------- | ------- | ------ |
| R1     | kurang, kurang            | [0; 0,2]     | 0       | 10      | 0      |
| R2     | kurang, cukup             | [0; 0,8]     | 0       | 40      | 0      |
| R3     | kurang, tinggi            | [0; 0]       | 0       | 35      | 0      |
| **R4** | **cukup, kurang**         | **[1; 0,2]** | **0,2** | **45**  | **9**  |
| **R5** | **cukup, cukup**          | **[1; 0,8]** | **0,8** | **100** | **80** |
| R6     | cukup, tinggi             | [1; 0]       | 0       | 85      | 0      |
| R7     | berlebih, kurang          | [0; 0,2]     | 0       | 40      | 0      |
| R8     | berlebih, cukup           | [0; 0,8]     | 0       | 70      | 0      |
| R9     | berlebih, tinggi          | [0; 0]       | 0       | 55      | 0      |

**Agregasi dan defuzzifikasi ([baris 37–41](../app/fuzzy/sugeno.ts#L37-L41)):**

- Σα = 1 dan Σα·z = 89.
- Pengecekan `Σα > 0` lolos. Kalau Σα = 0, fungsi akan melempar `FuzzyCoverageError`.
- `output = Σα·z / Σα = 89 / 1 = 89`.

**Output (`StageTrace`):**

```
{ inputs: [kalori, protein], rules: [9 RuleTrace], sumAlpha: 1, sumAlphaZ: 89, output: 89 }
```

Nilai `stage1.output = 89` inilah yang diteruskan ke tahap 2.

---

## Langkah 3: skor tahap 1 di-fuzzify ulang

Di [`engine.ts:22`](../app/fuzzy/engine.ts#L22), `fuzzify(v.kecukupan, 89)` memperlakukan angka 89 seperti input biasa, dengan himpunan rendah, sedang, dan tinggi:

| Himpunan | [a,b,c,d]       | Kondisi           | μ     |
| -------- | --------------- | ----------------- | ----- |
| rendah   | [0,0,30,55]     | (2) 89 ≥ 55       | 0     |
| sedang   | [30,55,65,85]   | (2) 89 ≥ 85       | 0     |
| tinggi   | [65,85,100,100] | (1) 85 ≤ 89 ≤ 100 | **1** |

Ini sambungan antara dua tahap: angka hasil tahap 1 di-fuzzify, lalu dipakai sebagai input fuzzy tahap 2.

---

## Langkah 4: `fuzzify` lemak dan serat

Di [`engine.ts:23–24`](../app/fuzzy/engine.ts#L23-L24):

| Variabel  | Himpunan                   | Kondisi   | μ                                                  |
| --------- | -------------------------- | --------- | -------------------------------------------------- |
| lemak 120 | kurang [0,0,60,80]         | (2)       | 0                                                  |
|           | cukup [60,80,110,130]      | (4) turun | (130−120)/20 = **0,5**                             |
|           | berlebih [110,130,200,200] | (3) naik  | (120−110)/20 = **0,5**                             |
| serat ≈55 | kurang [0,0,40,70]         | (4) turun | (70−55)/30 ≈ **0,5** (tepatnya 0,5000000000000002) |
|           | sedang [40,70,80,100]      | (3) naik  | (55−40)/30 ≈ **0,5** (tepatnya 0,4999999999999998) |
|           | cukup [80,100,200,200]     | (2)       | 0                                                  |

---

## Langkah 5: `inferStage` tahap 2

Pemanggilan: `inferStage('tahap 2', [lemak, kecukupan, serat], stage2Rules)` di [`engine.ts:25`](../app/fuzzy/engine.ts#L25).

Fungsinya sama dengan [langkah 2](#langkah-2-inferstage-tahap-1), tetapi dengan 27 aturan. Urutan `memberships` sekarang mengikuti `[lemak, kecukupan, serat]`.

| Aturan | Kondisi (lemak, kecukupan, serat) | memberships   | α   | z   | α·z  |
| ------ | --------------------------------- | ------------- | --- | --- | ---- |
| S16    | cukup, tinggi, kurang             | [0,5; 1; 0,5] | 0,5 | 75  | 37,5 |
| S17    | cukup, tinggi, sedang             | [0,5; 1; 0,5] | 0,5 | 75  | 37,5 |
| S25    | berlebih, tinggi, kurang          | [0,5; 1; 0,5] | 0,5 | 20  | 10   |
| S26    | berlebih, tinggi, sedang          | [0,5; 1; 0,5] | 0,5 | 50  | 25   |

23 aturan lain punya α = 0 karena minimal satu μ-nya 0. Contohnya S1 (lemak kurang, kecukupan rendah, serat kurang) punya memberships `[0; 0; 0,5]`, jadi min = 0. Aturan-aturan ini tetap disimpan agar tabel langkah hitung lengkap.

- Σα ≈ 2 dan Σα·z ≈ 110, sehingga **`output = 55`**.
- `stage2.output` menjadi `score` dan masuk ke `toCategory`.

---

## Langkah 6: `toCategory`

Pemanggilan: `toCategory(55, config.categories)` di [`category.ts:8`](../app/fuzzy/category.ts#L8).

**Input:** skor dan 4 kategori `{key, label, min}`.

**Apa yang terjadi di dalamnya:**

1. `rounded = Math.round(55 × 1e6) / 1e6 = 55`. Pembulatan ini membuang error floating point, supaya nilai seperti 64,9999999 tidak jatuh ke kategori di bawah 65.
2. Kategori diurutkan berdasarkan `min`: 0, 40, 65, 85.
3. Loop menyimpan kategori **terakhir** yang memenuhi `rounded ≥ min`:
   - 55 ≥ 0 terpenuhi (tidak_layak)
   - 55 ≥ 40 terpenuhi (perlu_perbaikan)
   - 55 ≥ 65 tidak
   - 55 ≥ 85 tidak

**Output:** `{ key: 'perlu_perbaikan', label: 'Perlu Perbaikan', min: 40 }`. Fungsi `evaluate` mengambil `.key` dan `.label` dari objek ini.

---

## Langkah 7: `buildReasons`

Pemanggilan: `buildReasons({ kalori, protein, lemak, serat })` di [`reasons.ts:89`](../app/fuzzy/reasons.ts#L89).

**Input:** 4 `VariableTrace` dari langkah 1 dan 4, **bukan skor**. Variabel kecukupan tidak ikut. Karena alasan diturunkan langsung dari μ, isinya selalu konsisten dengan tabel keanggotaan.

**Apa yang terjadi di dalamnya.** Untuk setiap aturan alasan ([`RULES`, baris 15–78](../app/fuzzy/reasons.ts#L15-L78)):

1. `degree` = μ terbesar dari himpunan yang dianggap masalah (`muOf` per himpunan, lalu `Math.max`), dibulatkan ke 6 desimal ([baris 95](../app/fuzzy/reasons.ts#L95)).
2. Kalau `degree ≤ 0`, aturan dilewati.
3. Kalau `degree ≥ 0,5`, dipakai alasan **kuat** (`text` dan severity asli). Kalau di bawah 0,5, dipakai alasan **ringan** (`mildText` dengan severity `catatan`).

| Aturan alasan   | Himpunan dicek | μ (via `muOf`)                              | degree                   | ≥ 0,5? | Hasil                                        |
| --------------- | -------------- | ------------------------------------------- | ------------------------ | ------ | -------------------------------------------- |
| kalori_kurang   | kurang         | 0                                           | 0                        | –      | dilewati                                     |
| kalori_berlebih | berlebih       | 0                                           | 0                        | –      | dilewati                                     |
| protein_kurang  | kurang         | 0,2                                         | 0,2                      | tidak  | `catatan`: "protein sedikit di bawah target" |
| protein_tinggi  | tinggi         | 0                                           | 0                        | –      | dilewati                                     |
| lemak_kurang    | kurang         | 0                                           | 0                        | –      | dilewati                                     |
| lemak_berlebih  | berlebih       | 0,5                                         | 0,5                      | ya     | `masalah`: "lemak berlebih"                  |
| serat_kurang    | kurang, sedang | max(0,5000000000000002; 0,4999999999999998) | 0,5 (setelah dibulatkan) | ya     | `masalah`: "serat masih di bawah target"     |

Setelah loop:

4. **Sort ([baris 109](../app/fuzzy/reasons.ts#L109)):** degree terbesar lebih dulu. Kalau degree sama, urutannya kalori, protein, lemak, serat. Lemak dan serat sama-sama 0,5, jadi lemak muncul lebih dulu.
5. **Cek ([baris 115](../app/fuzzy/reasons.ts#L115)):** kalau tidak ada satu pun alasan berstatus `masalah`, alasan "seimbang" disisipkan di depan. Di sini ada 2 masalah, jadi tidak disisipkan.

**Output:**

```json
[
  {
    "code": "lemak_berlebih",
    "severity": "masalah",
    "degree": 0.5,
    "text": "lemak berlebih",
    "suggestion": "Ganti cara masak goreng dengan kukus, rebus, atau panggang, dan kurangi minyak."
  },
  {
    "code": "serat_kurang",
    "severity": "masalah",
    "degree": 0.5,
    "text": "serat masih di bawah target",
    "suggestion": "Tambah porsi sayur atau buah."
  },
  {
    "code": "protein_kurang",
    "severity": "catatan",
    "degree": 0.2,
    "text": "protein sedikit di bawah target",
    "suggestion": "Tambah lauk sumber protein seperti telur, ikan, ayam, tempe, atau tahu."
  }
]
```

> Tanpa pembulatan di baris 95, degree serat (0,5000000000000002) akan lebih besar dari lemak (0,5), sehingga serat naik ke urutan pertama. Pembulatan itulah yang membuat tes "urutan alasan stabil" di [`engine.spec.ts:62`](../tests/unit/fuzzy/engine.spec.ts#L62) lolos.

---

## Langkah 8: `evaluate` menggabungkan semuanya

```
{ percent, stage1, stage2, score: 55, category: 'perlu_perbaikan',
  categoryLabel: 'Perlu Perbaikan', reasons: [3 alasan di atas] }
```

[`EvaluationService.create`](../app/services/evaluation_service.ts#L37) menyimpan objek ini ke kolom `result`. Selain itu, `scoreAdequacy` diisi `stage1.output` (89) dan `score` diisi 55. Data inilah yang ditampilkan di halaman hasil dan ekspor CSV.
