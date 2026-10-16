import { defaultConfig } from './default_config.js'
import { trapezoid } from './membership.js'
import type { FuzzyConfig, Rule, Trapezoid, VariableKey } from './types.js'

export interface ConfigIssue {
  path: string
  message: string
}

export type ConfigCheck =
  | { ok: true; config: FuzzyConfig }
  | { ok: false; issues: ConfigIssue[]; draft: FuzzyConfig }

const VARIABLE_KEYS: VariableKey[] = ['kalori', 'protein', 'kecukupan', 'lemak', 'serat']

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Form HTML dengan indeks > 20 diurai qs menjadi objek, bukan array. */
function asArray(value: unknown): any[] | undefined {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return Object.values(value)
  return undefined
}

function fmt(n: number) {
  return Number(n.toFixed(2)).toString().replace('.', ',')
}

/**
 * Membangun konfigurasi dari data mentah (form atau JSON impor) lalu
 * memeriksanya. Struktur (kunci variabel, himpunan, kombinasi aturan)
 * selalu mengikuti konfigurasi default; yang boleh diubah hanya angka
 * dan catatan. Dengan begitu 9 + 27 aturan dijamin lengkap dan unik.
 */
export function checkConfig(input: unknown): ConfigCheck {
  const issues: ConfigIssue[] = []
  const raw = (input ?? {}) as any
  const base = defaultConfig()

  const take = (value: unknown, path: string, fallback: number): number => {
    const n = num(value)
    if (n === null) {
      issues.push({ path, message: 'Harus berupa angka.' })
      return fallback
    }
    return n
  }

  /* Persen porsi */
  const portionPercent = take(raw.portionPercent, 'portionPercent', base.portionPercent)
  if (portionPercent <= 0 || portionPercent > 100) {
    issues.push({ path: 'portionPercent', message: 'Persen porsi harus di antara 0 dan 100.' })
  }

  /* Kelompok sasaran: daftar dari input, minimal satu */
  const rawGroups: any[] = asArray(raw.targetGroups) ?? base.targetGroups
  const targetGroups = rawGroups.map((g, gi) => {
    const fallback = base.targetGroups.find((b) => b.code === g?.code) ?? base.targetGroups[0]
    const code = String(g?.code ?? '').trim()
    const label = String(g?.label ?? '').trim()
    if (!/^[a-z0-9_]{2,40}$/.test(code)) {
      issues.push({ path: `targetGroups.${gi}.code`, message: 'Kode hanya huruf kecil, angka, dan garis bawah.' })
    }
    if (!label) issues.push({ path: `targetGroups.${gi}.label`, message: 'Nama kelompok wajib diisi.' })
    const akg = (sex: 'male' | 'female') => {
      const out = { ...fallback[sex] }
      for (const n of ['kalori', 'protein', 'lemak', 'serat'] as const) {
        const path = `targetGroups.${gi}.${sex}.${n}`
        out[n] = take(g?.[sex]?.[n], path, fallback[sex][n])
        if (out[n] <= 0) issues.push({ path, message: 'AKG harus lebih dari 0.' })
      }
      return out
    }
    return { code, label, male: akg('male'), female: akg('female') }
  })
  if (targetGroups.length === 0) {
    issues.push({ path: 'targetGroups', message: 'Minimal satu kelompok sasaran.' })
  }
  const codes = targetGroups.map((g) => g.code)
  if (new Set(codes).size !== codes.length) {
    issues.push({ path: 'targetGroups', message: 'Kode kelompok sasaran tidak boleh kembar.' })
  }

  /* Variabel dan himpunan */
  const variables = base.variables
  for (const key of VARIABLE_KEYS) {
    const variable = variables[key]
    const [min, max] = variable.domain
    variable.sets = variable.sets.map((set) => {
      const rawSet = asArray(raw.variables?.[key]?.sets)?.find((s: any) => s?.key === set.key)
      const rawParams = asArray(rawSet?.params)
      const params = [0, 1, 2, 3].map((i) =>
        take(rawParams?.[i], `variables.${key}.${set.key}.${i}`, set.params[i])
      ) as Trapezoid
      const [a, b, c, d] = params
      const path = `variables.${key}.${set.key}`
      if (!(a <= b && b <= c && c <= d)) {
        issues.push({ path, message: `${variable.label} ${set.label}: urutan harus a ≤ b ≤ c ≤ d.` })
      }
      if (a < min || d > max) {
        issues.push({ path, message: `${variable.label} ${set.label}: titik harus di rentang ${min}–${max}.` })
      }
      if (a === b && a !== min) {
        issues.push({ path, message: `${variable.label} ${set.label}: a = b hanya boleh di batas kiri domain (${min}).` })
      }
      if (c === d && d !== max) {
        issues.push({ path, message: `${variable.label} ${set.label}: c = d hanya boleh di batas kanan domain (${max}).` })
      }
      const note = typeof rawSet?.note === 'string' ? rawSet.note.slice(0, 500) : undefined
      return { ...set, params, note }
    })

    /* Cakupan: setiap titik domain harus punya minimal satu μ > 0 */
    const gaps: [number, number][] = []
    let gapStart: number | null = null
    const steps = Math.round((max - min) * 10)
    for (let i = 0; i <= steps; i++) {
      const x = min + i / 10
      const covered = variable.sets.some((s) => trapezoid(x, s.params) > 0)
      if (!covered && gapStart === null) gapStart = x
      if (covered && gapStart !== null) {
        gaps.push([gapStart, Math.round((x - 0.1) * 10) / 10])
        gapStart = null
      }
    }
    if (gapStart !== null) gaps.push([gapStart, max])
    for (const [from, to] of gaps) {
      issues.push({
        path: `variables.${key}`,
        message: `${variable.label}: ada celah tanpa himpunan di ${fmt(from)}–${fmt(to)}. Σα bisa bernilai 0.`,
      })
    }
  }

  /* Aturan: struktur dari default, keluaran dari input */
  const rules = (stage: 'stage1Rules' | 'stage2Rules'): Rule[] =>
    base[stage].map((rule) => {
      const rawRule = asArray(raw[stage])?.find((r: any) => r?.id === rule.id)
      const path = `${stage}.${rule.id}`
      const output = take(rawRule?.output, path, rule.output)
      if (output < 0 || output > 100) issues.push({ path, message: `Aturan ${rule.id}: konstanta harus 0–100.` })
      const note = typeof rawRule?.note === 'string' ? rawRule.note.slice(0, 500) : undefined
      return { ...rule, output, note }
    })
  const stage1Rules = rules('stage1Rules')
  const stage2Rules = rules('stage2Rules')

  /* Kategori: kunci tetap, batas dari input, harus menaik */
  const categories = base.categories.map((cat, ci) => {
    const rawCat = asArray(raw.categories)?.find((c: any) => c?.key === cat.key)
    const min = ci === 0 ? 0 : take(rawCat?.min, `categories.${cat.key}`, cat.min)
    return { ...cat, min }
  })
  for (let i = 1; i < categories.length; i++) {
    if (categories[i].min <= categories[i - 1].min || categories[i].min > 100) {
      issues.push({
        path: `categories.${categories[i].key}`,
        message: 'Batas kategori harus menaik dan tidak lebih dari 100.',
      })
    }
  }

  const rawSources =
    typeof raw.sources === 'string'
      ? raw.sources.split(String.fromCharCode(10)).map((s: string) => s.trim())
      : asArray(raw.sources)
  const sources = rawSources
    ? rawSources.filter((s: unknown) => typeof s === 'string' && s.trim()).map((s: string) => s.slice(0, 300))
    : base.sources

  const config: FuzzyConfig = {
    version: 1,
    portionPercent,
    targetGroups,
    variables,
    stage1Rules,
    stage2Rules,
    categories,
    sources,
  }
  return issues.length ? { ok: false, issues, draft: config } : { ok: true, config }
}
