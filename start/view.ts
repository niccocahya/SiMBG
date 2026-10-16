import edge from 'edge.js'
import { addCollection, edgeIconify } from 'edge-iconify'
import lucideIcons from '@iconify-json/lucide/icons.json' with { type: 'json' }
import {
  explainMembership,
  formatNumber,
  membershipSvg,
  type FuzzyConfig,
  type VariableKey,
  type VariableTrace,
} from '#fuzzy/index'

edge.use(edgeIconify)
addCollection(lucideIcons)

/** Helper tampilan yang dipakai di banyak halaman. */
edge.global('fmt', formatNumber)
edge.global('membershipSvg', membershipSvg)
edge.global('explainMembership', explainMembership)
edge.global('json', (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c'))

edge.global('categoryIcon', (key: string) => {
  switch (key) {
    case 'sangat_layak':
      return 'lucide:badge-check'
    case 'layak':
      return 'lucide:circle-check'
    case 'perlu_perbaikan':
      return 'lucide:triangle-alert'
    default:
      return 'lucide:circle-x'
  }
})

/** Label himpunan dari konfigurasi, misalnya setLabel(config, 'lemak', 'berlebih') → "Berlebih". */
edge.global(
  'setLabel',
  (config: FuzzyConfig, variable: VariableKey, key: string) =>
    config.variables[variable]?.sets.find((s) => s.key === key)?.label ?? key
)

/** Kondisi aturan dalam kalimat, misalnya "Kalori Cukup ∧ Protein Kurang". */
edge.global('ruleLabel', (config: FuzzyConfig, when: Partial<Record<VariableKey, string>>) =>
  Object.entries(when)
    .map(([v, k]) => {
      const variable = config.variables[v as VariableKey]
      return `${variable?.label ?? v} ${variable?.sets.find((s) => s.key === k)?.label ?? k}`
    })
    .join(' ∧ ')
)

/** Himpunan dengan derajat terbesar untuk satu variabel. */
edge.global('dominantSet', (trace: VariableTrace) =>
  trace.memberships.reduce((a, b) => (b.mu > a.mu ? b : a))
)

edge.global('sexLabel', (sex: string) =>
  sex === 'L' ? 'Laki-laki' : sex === 'P' ? 'Perempuan' : 'Rata-rata L/P'
)

edge.global('formatDate', (date: { toFormat?: (f: string, o?: object) => string } | null) =>
  date?.toFormat ? date.toFormat('d LLL yyyy, HH.mm', { locale: 'id' }) : '–'
)

export const NUTRIENT_META = [
  { key: 'kalori', label: 'Kalori', unit: 'kkal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'lemak', label: 'Lemak', unit: 'g' },
  { key: 'serat', label: 'Serat', unit: 'g' },
] as const

edge.global('nutrients', NUTRIENT_META)
edge.global('dayNames', ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'])
