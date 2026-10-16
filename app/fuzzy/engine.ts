import { toCategory } from './category.js'
import { fuzzify } from './membership.js'
import { buildReasons } from './reasons.js'
import { inferStage } from './sugeno.js'
import type { EvaluationResult, FuzzyConfig, NutritionValues } from './types.js'

/**
 * Evaluasi kelayakan gizi dua tahap.
 *
 * Tahap 1: kalori × protein (dalam % target porsi) → skor kecukupan 0–100.
 * Tahap 2: lemak × skor kecukupan × serat → skor kelayakan akhir.
 *
 * @param percent kandungan gizi dalam persen target satu porsi
 */
export function evaluate(percent: NutritionValues, config: FuzzyConfig): EvaluationResult {
  const v = config.variables

  const kalori = fuzzify(v.kalori, percent.kalori)
  const protein = fuzzify(v.protein, percent.protein)
  const stage1 = inferStage('tahap 1', [kalori, protein], config.stage1Rules)

  const kecukupan = fuzzify(v.kecukupan, stage1.output)
  const lemak = fuzzify(v.lemak, percent.lemak)
  const serat = fuzzify(v.serat, percent.serat)
  const stage2 = inferStage('tahap 2', [lemak, kecukupan, serat], config.stage2Rules)

  const category = toCategory(stage2.output, config.categories)

  return {
    percent: { ...percent },
    stage1,
    stage2,
    score: stage2.output,
    category: category.key,
    categoryLabel: category.label,
    reasons: buildReasons({ kalori, protein, lemak, serat }),
  }
}
