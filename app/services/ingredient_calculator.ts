import type { NutritionValues } from '#fuzzy/index'
import type { EvaluationItem } from '#models/evaluation'
import Ingredient from '#models/ingredient'

export interface ItemInput {
  ingredientId: number
  grams: number
}

/**
 * Menjumlahkan kandungan gizi bahan: nilai per 100 g × gram / 100.
 * Bahan tanpa data serat dihitung 0 dan dilaporkan lewat `missingFiber`.
 */
export async function calculateItems(inputs: ItemInput[]) {
  const ids = [...new Set(inputs.map((i) => i.ingredientId))]
  const ingredients = ids.length ? await Ingredient.query().whereIn('id', ids) : []
  const byId = new Map(ingredients.map((i) => [i.id, i]))

  const items: EvaluationItem[] = []
  const missingFiber: string[] = []
  const totals: NutritionValues = { kalori: 0, protein: 0, lemak: 0, serat: 0 }

  for (const input of inputs) {
    const ingredient = byId.get(input.ingredientId)
    if (!ingredient) continue
    const f = input.grams / 100
    const item: EvaluationItem = {
      ingredientId: ingredient.id,
      name: ingredient.name,
      grams: input.grams,
      kalori: ingredient.kalori * f,
      protein: ingredient.protein * f,
      lemak: ingredient.lemak * f,
      serat: ingredient.serat === null ? null : ingredient.serat * f,
    }
    if (item.serat === null) missingFiber.push(ingredient.name)
    items.push(item)
    totals.kalori += item.kalori
    totals.protein += item.protein
    totals.lemak += item.lemak
    totals.serat += item.serat ?? 0
  }

  const round = (n: number) => Math.round(n * 1000) / 1000
  return {
    items,
    missingFiber,
    totals: {
      kalori: round(totals.kalori),
      protein: round(totals.protein),
      lemak: round(totals.lemak),
      serat: round(totals.serat),
    },
  }
}
