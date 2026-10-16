import { clamp, trapezoid } from './membership.js'
import { formatNumber } from './format.js'
import type { Variable } from './types.js'

const W = 360
const H = 180
const PAD = { top: 26, right: 14, bottom: 30, left: 30 }

function esc(text: string) {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)
}

/**
 * Grafik fungsi keanggotaan sebagai string SVG, dengan garis penanda
 * nilai input dan titik potong tiap himpunan. Fungsi yang sama dipakai
 * di server (Edge) dan di browser (simulasi), jadi gambarnya selalu sama.
 *
 * Warna himpunan diambil dari variabel CSS --set-0, --set-1, --set-2.
 */
export function membershipSvg(variable: Variable, value?: number | null): string {
  const [min, max] = variable.domain
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const sx = (x: number) => PAD.left + ((x - min) / (max - min)) * plotW
  const sy = (mu: number) => PAD.top + (1 - mu) * plotH

  const step = max - min > 100 ? 50 : 25
  const parts: string[] = []

  parts.push(
    `<line class="mf-axis" x1="${sx(min)}" y1="${sy(0)}" x2="${sx(max)}" y2="${sy(0)}"/>`,
    `<line class="mf-grid" x1="${sx(min)}" y1="${sy(1)}" x2="${sx(max)}" y2="${sy(1)}"/>`,
    `<text class="mf-tick" x="${PAD.left - 6}" y="${sy(1) + 4}" text-anchor="end">1</text>`,
    `<text class="mf-tick" x="${PAD.left - 6}" y="${sy(0) + 4}" text-anchor="end">0</text>`
  )
  for (let t = min; t <= max; t += step) {
    parts.push(
      `<line class="mf-grid" x1="${sx(t)}" y1="${sy(0)}" x2="${sx(t)}" y2="${sy(0) + 4}"/>`,
      `<text class="mf-tick" x="${sx(t)}" y="${sy(0) + 17}" text-anchor="middle">${t}</text>`
    )
  }

  variable.sets.forEach((set, i) => {
    const [a, b, c, d] = set.params
    const points: [number, number][] = [
      [a, a === b ? 1 : 0],
      [b, 1],
      [c, 1],
      [d, c === d ? 1 : 0],
    ]
    const path = points.map(([x, mu]) => `${sx(x).toFixed(1)},${sy(mu).toFixed(1)}`).join(' ')
    parts.push(
      `<polyline class="mf-set mf-set-${i}" points="${path}"/>`,
      `<text class="mf-label mf-label-${i}" x="${sx((b + c) / 2).toFixed(1)}" y="${PAD.top - 8}" text-anchor="middle">${esc(set.label)}</text>`
    )
  })

  if (value !== null && value !== undefined && Number.isFinite(value)) {
    const x = clamp(value, variable.domain)
    parts.push(
      `<line class="mf-marker" x1="${sx(x).toFixed(1)}" y1="${sy(0)}" x2="${sx(x).toFixed(1)}" y2="${sy(1) - 4}"/>`
    )
    variable.sets.forEach((set, i) => {
      const mu = trapezoid(x, set.params)
      if (mu <= 0) return
      const cx = sx(x)
      const anchor = cx > W - 70 ? 'end' : 'start'
      const dx = anchor === 'end' ? -7 : 7
      parts.push(
        `<circle class="mf-dot mf-set-${i}" cx="${cx.toFixed(1)}" cy="${sy(mu).toFixed(1)}" r="4"/>`,
        `<text class="mf-value" x="${(cx + dx).toFixed(1)}" y="${(sy(mu) + (mu > 0.9 ? 14 : -6)).toFixed(1)}" text-anchor="${anchor}">μ=${formatNumber(mu, 2)}</text>`
      )
    })
  }

  const title = `${variable.label}${value !== null && value !== undefined ? ` = ${formatNumber(value)}` : ''}`
  return `<svg class="mf-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Grafik fungsi keanggotaan ${title}`)}" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`
}
