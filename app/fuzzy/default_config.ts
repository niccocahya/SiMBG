import type { FuzzyConfig, Rule } from './types.js'

/**
 * Parameter awal persis seperti PRD. Disalin ke basis data sebagai set
 * "Default PRD" yang terkunci; semua perubahan dilakukan pada salinannya.
 *
 * PERHATIAN: angka AKG di bawah ditulis dari ingatan berdasarkan
 * Permenkes No. 28 Tahun 2019 dan WAJIB diverifikasi ke dokumen asli
 * sebelum dikutip di laporan.
 */

const STAGE1_TABLE: Record<string, Record<string, number>> = {
  kurang: { kurang: 10, cukup: 40, tinggi: 35 },
  cukup: { kurang: 45, cukup: 100, tinggi: 85 },
  berlebih: { kurang: 40, cukup: 70, tinggi: 55 },
}

/** [lemak, kecukupan] → [serat kurang, serat sedang, serat cukup] */
const STAGE2_TABLE: [string, string, [number, number, number]][] = [
  ['kurang', 'sedang', [20, 50, 50]],
  ['kurang', 'tinggi', [50, 75, 75]],
  ['cukup', 'sedang', [50, 75, 75]],
  ['cukup', 'tinggi', [75, 75, 95]],
  ['berlebih', 'sedang', [20, 50, 50]],
  ['berlebih', 'tinggi', [20, 50, 50]],
  ['kurang', 'rendah', [20, 20, 20]],
  ['cukup', 'rendah', [20, 20, 20]],
  ['berlebih', 'rendah', [20, 20, 20]],
]

function buildStage1(): Rule[] {
  const rules: Rule[] = []
  let i = 1
  for (const kalori of ['kurang', 'cukup', 'berlebih']) {
    for (const protein of ['kurang', 'cukup', 'tinggi']) {
      rules.push({ id: `R${i++}`, when: { kalori, protein }, output: STAGE1_TABLE[kalori][protein] })
    }
  }
  return rules
}

function buildStage2(): Rule[] {
  const rules: Rule[] = []
  let i = 1
  for (const lemak of ['kurang', 'cukup', 'berlebih']) {
    for (const kecukupan of ['rendah', 'sedang', 'tinggi']) {
      const row = STAGE2_TABLE.find(([l, k]) => l === lemak && k === kecukupan)!
      ;(['kurang', 'sedang', 'cukup'] as const).forEach((serat, idx) => {
        rules.push({ id: `S${i++}`, when: { lemak, kecukupan, serat }, output: row[2][idx] })
      })
    }
  }
  return rules
}

export function defaultConfig(): FuzzyConfig {
  return {
    version: 1,
    portionPercent: 30,
    targetGroups: [
      {
        code: 'tk_4_6',
        label: 'PAUD/TK (4–6 tahun)',
        male: { kalori: 1400, protein: 25, lemak: 50, serat: 20 },
        female: { kalori: 1400, protein: 25, lemak: 50, serat: 20 },
      },
      {
        code: 'sd_7_9',
        label: 'SD kelas 1–3 (7–9 tahun)',
        male: { kalori: 1650, protein: 40, lemak: 55, serat: 23 },
        female: { kalori: 1650, protein: 40, lemak: 55, serat: 23 },
      },
      {
        code: 'sd_10_12',
        label: 'SD kelas 4–6 (10–12 tahun)',
        male: { kalori: 2000, protein: 50, lemak: 65, serat: 28 },
        female: { kalori: 1900, protein: 55, lemak: 65, serat: 27 },
      },
      {
        code: 'smp_13_15',
        label: 'SMP (13–15 tahun)',
        male: { kalori: 2400, protein: 70, lemak: 80, serat: 34 },
        female: { kalori: 2050, protein: 65, lemak: 70, serat: 29 },
      },
      {
        code: 'sma_16_18',
        label: 'SMA (16–18 tahun)',
        male: { kalori: 2650, protein: 75, lemak: 85, serat: 37 },
        female: { kalori: 2100, protein: 65, lemak: 70, serat: 29 },
      },
    ],
    variables: {
      kalori: {
        key: 'kalori',
        label: 'Kalori',
        unit: '% target',
        domain: [0, 200],
        sets: [
          { key: 'kurang', label: 'Kurang', params: [0, 0, 70, 90] },
          { key: 'cukup', label: 'Cukup', params: [70, 90, 110, 130] },
          { key: 'berlebih', label: 'Berlebih', params: [110, 130, 200, 200] },
        ],
      },
      protein: {
        key: 'protein',
        label: 'Protein',
        unit: '% target',
        domain: [0, 200],
        sets: [
          { key: 'kurang', label: 'Kurang', params: [0, 0, 60, 85] },
          { key: 'cukup', label: 'Cukup', params: [60, 85, 115, 140] },
          { key: 'tinggi', label: 'Tinggi', params: [115, 140, 200, 200] },
        ],
      },
      kecukupan: {
        key: 'kecukupan',
        label: 'Skor kecukupan',
        unit: 'skor',
        domain: [0, 100],
        sets: [
          { key: 'rendah', label: 'Rendah', params: [0, 0, 30, 55] },
          { key: 'sedang', label: 'Sedang', params: [30, 55, 65, 85] },
          { key: 'tinggi', label: 'Tinggi', params: [65, 85, 100, 100] },
        ],
      },
      lemak: {
        key: 'lemak',
        label: 'Lemak',
        unit: '% target',
        domain: [0, 200],
        sets: [
          { key: 'kurang', label: 'Kurang', params: [0, 0, 60, 80] },
          { key: 'cukup', label: 'Cukup', params: [60, 80, 110, 130] },
          { key: 'berlebih', label: 'Berlebih', params: [110, 130, 200, 200] },
        ],
      },
      serat: {
        key: 'serat',
        label: 'Serat',
        unit: '% target',
        domain: [0, 200],
        sets: [
          { key: 'kurang', label: 'Kurang', params: [0, 0, 40, 70] },
          { key: 'sedang', label: 'Sedang', params: [40, 70, 80, 100] },
          { key: 'cukup', label: 'Cukup', params: [80, 100, 200, 200] },
        ],
      },
    },
    stage1Rules: buildStage1(),
    stage2Rules: buildStage2(),
    categories: [
      { key: 'tidak_layak', label: 'Tidak Layak', min: 0 },
      { key: 'perlu_perbaikan', label: 'Perlu Perbaikan', min: 40 },
      { key: 'layak', label: 'Layak', min: 65 },
      { key: 'sangat_layak', label: 'Sangat Layak', min: 85 },
    ],
    sources: [
      'Permenkes No. 28 Tahun 2019 tentang Angka Kecukupan Gizi (perlu diverifikasi)',
      'Pedoman Gizi Seimbang, Permenkes No. 41 Tahun 2014 (perlu diverifikasi)',
      'Petunjuk teknis program Makan Bergizi Gratis (persen AKG per porsi, usulan 30%)',
    ],
  }
}
