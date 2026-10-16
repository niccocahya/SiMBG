import { muOf } from './membership.js'
import type { NutrientKey, Reason, VariableTrace } from './types.js'

interface ReasonRule {
  code: string
  variable: NutrientKey
  /** Himpunan yang menandakan masalah; derajatnya = μ terbesar di antara himpunan ini. */
  sets: string[]
  severity: 'masalah' | 'catatan'
  text: string
  mildText: string
  suggestion?: string
}

const RULES: ReasonRule[] = [
  {
    code: 'kalori_kurang',
    variable: 'kalori',
    sets: ['kurang'],
    severity: 'masalah',
    text: 'energi (kalori) masih di bawah target',
    mildText: 'energi (kalori) sedikit di bawah target',
    suggestion: 'Tambah porsi makanan pokok seperti nasi, kentang, atau ubi.',
  },
  {
    code: 'kalori_berlebih',
    variable: 'kalori',
    sets: ['berlebih'],
    severity: 'masalah',
    text: 'energi (kalori) berlebih',
    mildText: 'energi (kalori) sedikit di atas target',
    suggestion: 'Kurangi porsi makanan pokok atau makanan yang digoreng.',
  },
  {
    code: 'protein_kurang',
    variable: 'protein',
    sets: ['kurang'],
    severity: 'masalah',
    text: 'protein masih di bawah target',
    mildText: 'protein sedikit di bawah target',
    suggestion: 'Tambah lauk sumber protein seperti telur, ikan, ayam, tempe, atau tahu.',
  },
  {
    code: 'protein_tinggi',
    variable: 'protein',
    sets: ['tinggi'],
    severity: 'catatan',
    text: 'protein melebihi target',
    mildText: 'protein sedikit di atas target',
  },
  {
    code: 'lemak_kurang',
    variable: 'lemak',
    sets: ['kurang'],
    severity: 'masalah',
    text: 'lemak masih di bawah target',
    mildText: 'lemak sedikit di bawah target',
    suggestion: 'Tambah sumber lemak sehat, misalnya ikan, kacang, atau sedikit santan.',
  },
  {
    code: 'lemak_berlebih',
    variable: 'lemak',
    sets: ['berlebih'],
    severity: 'masalah',
    text: 'lemak berlebih',
    mildText: 'lemak sedikit di atas target',
    suggestion: 'Ganti cara masak goreng dengan kukus, rebus, atau panggang, dan kurangi minyak.',
  },
  {
    code: 'serat_kurang',
    variable: 'serat',
    sets: ['kurang', 'sedang'],
    severity: 'masalah',
    text: 'serat masih di bawah target',
    mildText: 'serat sedikit di bawah target',
    suggestion: 'Tambah porsi sayur atau buah.',
  },
]

const ORDER: NutrientKey[] = ['kalori', 'protein', 'lemak', 'serat']

/**
 * Alasan dalam bahasa awam, diturunkan dari derajat keanggotaan (bukan
 * dari skor) supaya selalu konsisten dengan jejak perhitungan.
 *
 * μ ≥ 0,5 → alasan penuh, 0 < μ < 0,5 → alasan ringan ("sedikit …").
 * Urutan: derajat terbesar dulu, lalu urutan kalori, protein, lemak, serat.
 */
export function buildReasons(traces: Record<NutrientKey, VariableTrace>): Reason[] {
  const reasons: Reason[] = []

  for (const rule of RULES) {
    const trace = traces[rule.variable]
    // Dibulatkan agar noise floating point (0,4999999…) tidak mengubah ambang atau urutan.
    const degree = Math.round(Math.max(...rule.sets.map((set) => muOf(trace, set))) * 1e6) / 1e6
    if (degree <= 0) continue

    const strong = degree >= 0.5
    reasons.push({
      code: rule.code,
      variable: rule.variable,
      severity: strong ? rule.severity : 'catatan',
      degree,
      text: strong ? rule.text : rule.mildText,
      suggestion: rule.suggestion,
    })
  }

  reasons.sort(
    (a, b) =>
      b.degree - a.degree ||
      ORDER.indexOf(a.variable as NutrientKey) - ORDER.indexOf(b.variable as NutrientKey)
  )

  if (!reasons.some((r) => r.severity === 'masalah')) {
    reasons.unshift({
      code: 'seimbang',
      variable: 'umum',
      severity: 'baik',
      degree: 1,
      text: 'kalori, protein, lemak, dan serat sudah sesuai target',
    })
  }

  return reasons
}
