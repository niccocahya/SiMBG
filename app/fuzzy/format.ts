import type { MembershipTrace } from './types.js'

/** Angka gaya Indonesia: koma desimal, titik ribuan, maksimal `digits` desimal. */
export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '–'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(value)
}

/** Rumus satu derajat keanggotaan, misalnya "(85 − 80) / (85 − 60) = 0,2". */
export function explainMembership(x: number, m: MembershipTrace): string {
  const [a, b, c, d] = m.params.map((p) => formatNumber(p))
  const xs = formatNumber(x)
  const mu = formatNumber(m.mu, 4)
  switch (m.branch) {
    case 'inti':
      return `${b} ≤ ${xs} ≤ ${c} → 1`
    case 'nol':
      return `${xs} di luar (${a}, ${d}) → 0`
    case 'naik':
      return `(${xs} − ${a}) / (${b} − ${a}) = ${mu}`
    case 'turun':
      return `(${d} − ${xs}) / (${d} − ${c}) = ${mu}`
  }
}
