import { muOf } from './membership.js'
import type { Rule, StageTrace, VariableTrace } from './types.js'

export class FuzzyCoverageError extends Error {
  constructor(stage: string) {
    super(
      `Tidak ada aturan yang aktif di ${stage} (Σα = 0). Periksa apakah himpunan fuzzy menutup seluruh rentang nilai.`
    )
    this.name = 'FuzzyCoverageError'
  }
}

/**
 * Inferensi Sugeno orde nol satu tahap.
 *
 *   α_i = min(μ_A(x1), μ_B(x2), …)      z = Σ α_i z_i / Σ α_i
 *
 * Semua aturan dihitung, termasuk yang α-nya 0, supaya tabel jejak lengkap.
 */
export function inferStage(stageName: string, inputs: VariableTrace[], rules: Rule[]): StageTrace {
  const traces = rules.map((rule) => {
    const memberships = inputs.map((input) => {
      const setKey = rule.when[input.variable]
      return setKey === undefined ? 1 : muOf(input, setKey)
    })
    const alpha = Math.min(...memberships)
    return {
      id: rule.id,
      when: rule.when,
      memberships,
      alpha,
      z: rule.output,
      alphaZ: alpha * rule.output,
    }
  })

  const sumAlpha = traces.reduce((sum, r) => sum + r.alpha, 0)
  const sumAlphaZ = traces.reduce((sum, r) => sum + r.alphaZ, 0)
  if (sumAlpha <= 0) throw new FuzzyCoverageError(stageName)

  return { inputs, rules: traces, sumAlpha, sumAlphaZ, output: sumAlphaZ / sumAlpha }
}
