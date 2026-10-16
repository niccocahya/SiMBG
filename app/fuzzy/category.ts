import type { Category } from './types.js'

/**
 * Menentukan kategori dari skor akhir. Skor dibulatkan ke 6 desimal
 * lebih dulu supaya hasil floating point seperti 64,9999999 tidak jatuh
 * ke kategori di bawahnya.
 */
export function toCategory(score: number, categories: Category[]): Category {
  const rounded = Math.round(score * 1e6) / 1e6
  const sorted = [...categories].sort((a, b) => a.min - b.min)
  let result = sorted[0]
  for (const category of sorted) {
    if (rounded >= category.min) result = category
  }
  return result
}
