/**
 * Tipe data mesin Fuzzy Sugeno.
 *
 * Folder app/fuzzy sengaja tidak mengimpor apa pun dari AdonisJS supaya
 * bisa diuji sendiri dan dipakai juga di browser (simulasi langsung).
 */

/** Trapesium [a, b, c, d]: 0 di a, naik ke 1 di b, tetap 1 sampai c, turun ke 0 di d. */
export type Trapezoid = [number, number, number, number]

export type NutrientKey = 'kalori' | 'protein' | 'lemak' | 'serat'
export type VariableKey = 'kalori' | 'protein' | 'kecukupan' | 'lemak' | 'serat'
export type CategoryKey = 'tidak_layak' | 'perlu_perbaikan' | 'layak' | 'sangat_layak'
export type Sex = 'avg' | 'L' | 'P'

export interface FuzzySet {
  key: string
  label: string
  params: Trapezoid
  /** Alasan atau rujukan pemilihan titik himpunan (untuk laporan). */
  note?: string
}

export interface Variable {
  key: VariableKey
  label: string
  unit: string
  domain: [number, number]
  sets: FuzzySet[]
}

export interface Rule {
  id: string
  /** Pasangan variabel → kunci himpunan, misalnya { kalori: 'cukup', protein: 'kurang' }. */
  when: Partial<Record<VariableKey, string>>
  output: number
  note?: string
}

export interface Category {
  key: CategoryKey
  label: string
  /** Skor minimum (inklusif) untuk masuk kategori ini. */
  min: number
}

/** Angka Kecukupan Gizi harian. */
export interface Akg {
  kalori: number
  protein: number
  lemak: number
  serat: number
}

export interface TargetGroup {
  code: string
  label: string
  male: Akg
  female: Akg
}

export interface FuzzyConfig {
  version: 1
  /** Persen AKG harian yang harus dipenuhi satu porsi. */
  portionPercent: number
  targetGroups: TargetGroup[]
  variables: Record<VariableKey, Variable>
  /** Tahap 1: kalori × protein → skor kecukupan (9 aturan). */
  stage1Rules: Rule[]
  /** Tahap 2: lemak × kecukupan × serat → skor kelayakan (27 aturan). */
  stage2Rules: Rule[]
  categories: Category[]
  sources?: string[]
}

export type NutritionValues = Record<NutrientKey, number>

/* --------------------------------------------------------------------------
 * Jejak perhitungan
 * ------------------------------------------------------------------------ */

export type MembershipBranch = 'inti' | 'nol' | 'naik' | 'turun'

export interface MembershipTrace {
  set: string
  label: string
  params: Trapezoid
  mu: number
  branch: MembershipBranch
}

export interface VariableTrace {
  variable: VariableKey
  label: string
  raw: number
  value: number
  clipped: boolean
  memberships: MembershipTrace[]
}

export interface RuleTrace {
  id: string
  when: Partial<Record<VariableKey, string>>
  memberships: number[]
  alpha: number
  z: number
  alphaZ: number
}

export interface StageTrace {
  inputs: VariableTrace[]
  rules: RuleTrace[]
  sumAlpha: number
  sumAlphaZ: number
  output: number
}

export type ReasonSeverity = 'masalah' | 'catatan' | 'baik'

export interface Reason {
  code: string
  variable: NutrientKey | 'umum'
  severity: ReasonSeverity
  degree: number
  text: string
  suggestion?: string
}

export interface EvaluationResult {
  percent: NutritionValues
  stage1: StageTrace
  stage2: StageTrace
  score: number
  category: CategoryKey
  categoryLabel: string
  reasons: Reason[]
}
