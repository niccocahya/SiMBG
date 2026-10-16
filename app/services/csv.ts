/**
 * CSV sederhana dengan pemisah titik koma (";") agar langsung terbaca
 * oleh Excel berbahasa Indonesia, yang memakai koma sebagai desimal.
 */
const DELIMITER = ';'

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text =
    typeof value === 'number' ? String(Number(value.toFixed(6))).replace('.', ',') : String(value)
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Menghasilkan CSV dengan BOM UTF-8. */
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(DELIMITER))
  return '﻿' + lines.join('\r\n') + '\r\n'
}

/** Membaca CSV (pemisah ";" atau ","), mendukung sel bertanda kutip. */
export function parseCsv(input: string): Record<string, string>[] {
  const text = input.replace(/^﻿/, '')
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = firstLine.includes(';') ? ';' : ','

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (!header) return []
  const keys = header.map((h) => h.trim())
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}

/** "12,5" atau "12.5" → 12.5; kosong → null. */
export function parseDecimal(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value.trim() === '') return null
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
