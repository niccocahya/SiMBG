import type { CategoryKey, FuzzyConfig } from '#fuzzy/index'
import type ExpertCase from '#models/expert_case'
import EvaluationService from './evaluation_service.js'

export interface ExpertRow {
  case: ExpertCase
  score: number | null
  systemCategory: CategoryKey | null
  match: boolean
  error?: string
}

export interface AgreementReport {
  rows: ExpertRow[]
  total: number
  matches: number
  percent: number
  /** confusion[pakar][sistem] = jumlah menu */
  confusion: Record<string, Record<string, number>>
  categories: { key: CategoryKey; label: string }[]
}

/** Membandingkan kategori sistem dengan kategori pakar (metrik PRD: ≥ 80%). */
export function measureAgreement(config: FuzzyConfig, cases: ExpertCase[]): AgreementReport {
  const categories = config.categories.map((c) => ({ key: c.key, label: c.label }))
  const confusion: Record<string, Record<string, number>> = {}
  for (const a of categories) {
    confusion[a.key] = {}
    for (const b of categories) confusion[a.key][b.key] = 0
  }

  const rows: ExpertRow[] = cases.map((c) => {
    try {
      const { result } = EvaluationService.compute(config, c.groupCode, c.sex, {
        kalori: c.kalori,
        protein: c.protein,
        lemak: c.lemak,
        serat: c.serat,
      })
      if (confusion[c.expertCategory]) confusion[c.expertCategory][result.category]++
      return {
        case: c,
        score: result.score,
        systemCategory: result.category,
        match: result.category === c.expertCategory,
      }
    } catch (error) {
      return { case: c, score: null, systemCategory: null, match: false, error: (error as Error).message }
    }
  })

  const matches = rows.filter((r) => r.match).length
  return {
    rows,
    total: rows.length,
    matches,
    percent: rows.length ? (matches / rows.length) * 100 : 0,
    confusion,
    categories,
  }
}
