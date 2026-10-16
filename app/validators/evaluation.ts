import vine from '@vinejs/vine'

/** Menerima "12,5" maupun "12.5". */
export const decimal = () =>
  vine.number().parse((value) => (typeof value === 'string' ? value.trim().replace(',', '.') : value))

/**
 * Batas keras per porsi (ditolak). Nilai di atas 200% target tetap
 * diterima, tetapi dipotong ke 200% di mesin dan diberi peringatan.
 */
export const LIMITS = {
  kalori: { min: 1, max: 3000 },
  protein: { min: 0, max: 300 },
  lemak: { min: 0, max: 300 },
  serat: { min: 0, max: 100 },
}

export const nutrition = {
  kalori: decimal().min(LIMITS.kalori.min).max(LIMITS.kalori.max),
  protein: decimal().min(LIMITS.protein.min).max(LIMITS.protein.max),
  lemak: decimal().min(LIMITS.lemak.min).max(LIMITS.lemak.max),
  serat: decimal().min(LIMITS.serat.min).max(LIMITS.serat.max),
}

export const subject = {
  menuName: vine.string().trim().maxLength(150).nullable().optional(),
  groupCode: vine.string().trim().maxLength(40),
  sex: vine.enum(['avg', 'L', 'P'] as const),
}

export const evaluationValidator = vine.create({
  ...subject,
  ...nutrition,
})

/**
 * Mode "hitung dari bahan": total gizi dihitung ulang di server dari
 * daftar bahan, jadi angka total yang dikirim browser tidak dipercaya.
 */
export const ingredientEvaluationValidator = vine.create({
  ...subject,
  items: vine
    .array(
      vine.object({
        ingredientId: vine.number().withoutDecimals().positive(),
        grams: decimal().min(0.1).max(5000),
      })
    )
    .minLength(1)
    .maxLength(40),
})

/** Evaluasi tanpa simpan (simulasi, API). */
export const computeValidator = vine.create({
  ...subject,
  ...nutrition,
})

export const historyFilterValidator = vine.create({
  q: vine.string().trim().maxLength(100).optional(),
  category: vine.string().trim().maxLength(40).optional(),
  group: vine.string().trim().maxLength(40).optional(),
  mine: vine.boolean().optional(),
  sort: vine.enum(['terbaru', 'terlama', 'skor_tinggi', 'skor_rendah'] as const).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
})
