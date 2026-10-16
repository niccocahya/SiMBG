import type { MembershipBranch, Trapezoid, Variable, VariableTrace } from './types.js'

/**
 * Derajat keanggotaan trapesium beserta cabang rumus yang dipakai.
 *
 * Cabang "inti" diperiksa lebih dulu sehingga himpunan bahu (a = b atau
 * c = d) bernilai 1 di ujung domain dan pembagian dengan nol tidak
 * pernah terjadi: cabang naik hanya tercapai jika a < x < b, cabang turun
 * hanya jika c < x < d.
 */
export function trapezoidDetail(x: number, [a, b, c, d]: Trapezoid): {
  mu: number
  branch: MembershipBranch
} {
  if (x >= b && x <= c) return { mu: 1, branch: 'inti' }
  if (x <= a || x >= d) return { mu: 0, branch: 'nol' }
  if (x < b) return { mu: (x - a) / (b - a), branch: 'naik' }
  return { mu: (d - x) / (d - c), branch: 'turun' }
}

export function trapezoid(x: number, params: Trapezoid): number {
  return trapezoidDetail(x, params).mu
}

export function clamp(x: number, [min, max]: [number, number]): number {
  return Math.min(max, Math.max(min, x))
}

/** Fuzzifikasi satu nilai terhadap semua himpunan sebuah variabel. */
export function fuzzify(variable: Variable, raw: number): VariableTrace {
  const value = clamp(raw, variable.domain)
  return {
    variable: variable.key,
    label: variable.label,
    raw,
    value,
    clipped: value !== raw,
    memberships: variable.sets.map((set) => ({
      set: set.key,
      label: set.label,
      params: set.params,
      ...trapezoidDetail(value, set.params),
    })),
  }
}

export function muOf(trace: VariableTrace, setKey: string): number {
  return trace.memberships.find((m) => m.set === setKey)?.mu ?? 0
}
