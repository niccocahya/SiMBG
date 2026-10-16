import Alpine from 'alpinejs'
// Mesin yang sama dengan server: simulasi di browser selalu sama hasilnya.
import { evaluate, membershipSvg, formatNumber } from '../../app/fuzzy/index.ts'

const NUTRIENTS = ['kalori', 'protein', 'lemak', 'serat']

/** "12,5" → 12.5; kosong/tidak valid → NaN */
function toNumber(value) {
  if (typeof value === 'number') return value
  if (value === null || value === undefined) return NaN
  const text = String(value).trim().replace(',', '.')
  return text === '' ? NaN : Number(text)
}

function fmt(value, digits = 2) {
  return Number.isFinite(value) ? formatNumber(value, digits) : '–'
}

function readJson(id) {
  const el = document.getElementById(id)
  return el ? JSON.parse(el.textContent || '{}') : {}
}

function pctClass(pct, nutrient) {
  if (!Number.isFinite(pct)) return ''
  if (nutrient === 'serat') return pct >= 100 ? 'pct--ok' : 'pct--low'
  if (pct < 90) return 'pct--low'
  if (pct > 110) return 'pct--high'
  return 'pct--ok'
}

window.fmt = fmt

/* ------------------------------------------------------------------------
 * F-01 / F-07: form evaluasi
 * ---------------------------------------------------------------------- */
Alpine.data('evaluationForm', () => ({
  data: { targets: {}, groups: [], ingredients: [], samples: [], initial: {} },
  mode: 'manual',
  menuName: '',
  groupCode: '',
  sex: 'avg',
  values: { kalori: '', protein: '', lemak: '', serat: '' },
  items: [],
  search: '',
  submitting: false,

  init() {
    this.data = readJson('form-data')
    const init = this.data.initial || {}
    this.mode = init.mode === 'bahan' ? 'bahan' : 'manual'
    this.menuName = init.menuName || ''
    this.groupCode = init.groupCode || this.data.groups[0]?.code
    this.sex = init.sex || 'avg'
    for (const n of NUTRIENTS) this.values[n] = init.values?.[n] ?? ''
    this.items = (init.items || [])
      .map((i) => ({ id: Number(i.id ?? i.ingredientId), grams: i.grams }))
      .filter((i) => Number.isFinite(i.id))
  },

  fmt,

  get currentGroup() {
    return this.data.groups.find((g) => g.code === this.groupCode)
  },
  get target() {
    const sex = this.currentGroup?.sameSex ? 'avg' : this.sex
    return this.data.targets[this.groupCode]?.[sex]
  },
  get filtered() {
    const q = this.search.trim().toLowerCase()
    if (!q) return []
    return this.data.ingredients.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 30)
  },
  get totals() {
    const t = { kalori: 0, protein: 0, lemak: 0, serat: 0 }
    for (const item of this.items) {
      for (const n of NUTRIENTS) t[n] += this.itemValue(item, n) || 0
    }
    for (const n of NUTRIENTS) t[n] = Math.round(t[n] * 1000) / 1000
    return t
  },
  get missingFiber() {
    return this.items.map((i) => this.ingredient(i.id)).filter((i) => i && i.serat === null).map((i) => i.name)
  },

  ingredient(id) {
    return this.data.ingredients.find((i) => i.id === Number(id))
  },
  itemValue(item, nutrient) {
    const ing = this.ingredient(item.id)
    const grams = toNumber(item.grams)
    if (!ing || !Number.isFinite(grams)) return NaN
    return ((ing[nutrient] ?? 0) * grams) / 100
  },
  addItem(ing) {
    this.items.push({ id: ing.id, grams: 100 })
    this.search = ''
  },
  current(nutrient) {
    return this.mode === 'bahan' ? this.totals[nutrient] : toNumber(this.values[nutrient])
  },
  pct(nutrient) {
    const t = this.target?.[nutrient]
    const v = this.current(nutrient)
    return t && Number.isFinite(v) ? (v / t) * 100 : NaN
  },
  pctText(nutrient) {
    const p = this.pct(nutrient)
    return Number.isFinite(p) ? `${fmt(p, 0)}% target` : ''
  },
  pctClass(nutrient) {
    return pctClass(this.pct(nutrient), nutrient)
  },
  fillSample(sample) {
    if (!this.target) return
    this.mode = 'manual'
    this.menuName = sample.name
    for (const n of NUTRIENTS) {
      this.values[n] = String(Math.round(((sample.percent[n] * this.target[n]) / 100) * 1000) / 1000)
    }
  },
}))

/* ------------------------------------------------------------------------
 * F-13: simulasi "bagaimana jika" di halaman hasil
 * ---------------------------------------------------------------------- */
Alpine.data('simulator', () => ({
  config: null,
  target: {},
  percent: { kalori: 0, protein: 0, lemak: 0, serat: 0 },
  original: {},
  result: null,
  error: null,

  init() {
    const data = readJson('sim-data')
    this.config = data.config
    this.target = data.target
    for (const n of NUTRIENTS) {
      this.percent[n] = Math.round(data.percent[n] * 10) / 10
      this.original[n] = this.percent[n]
    }
    this.recompute()
    this.$watch('percent', () => this.recompute(), { deep: true })
  },

  fmt,

  recompute() {
    try {
      const p = {}
      for (const n of NUTRIENTS) p[n] = Number(this.percent[n])
      this.result = evaluate(p, this.config)
      this.error = null
    } catch (e) {
      this.error = e.message
    }
  },
  grams(n) {
    return (Number(this.percent[n]) * this.target[n]) / 100
  },
  delta(n) {
    const d = Number(this.percent[n]) - this.original[n]
    return Math.abs(d) < 0.05 ? '' : `${d > 0 ? '+' : '−'}${fmt(Math.abs((d * this.target[n]) / 100), 1)}`
  },
  reset() {
    for (const n of NUTRIENTS) this.percent[n] = this.original[n]
  },
  chart(variable) {
    if (!this.result) return ''
    const value =
      variable === 'kecukupan' ? this.result.stage1.output : Number(this.percent[variable])
    return membershipSvg(this.config.variables[variable], value)
  },
  get changed() {
    return NUTRIENTS.some((n) => Math.abs(Number(this.percent[n]) - this.original[n]) >= 0.05)
  },
}))

/* ------------------------------------------------------------------------
 * F-09: pratinjau grafik saat mengubah titik himpunan
 * ---------------------------------------------------------------------- */
Alpine.data('variablePreview', (key) => ({
  svg: '',
  init() {
    this.render()
    this.$root.addEventListener('input', () => this.render())
  },
  render() {
    const base = readJson('param-data').variables?.[key]
    if (!base) return
    const variable = structuredClone(base)
    variable.sets.forEach((set, si) => {
      set.params = set.params.map((p, i) => {
        const el = this.$root.querySelector(`[data-param="${si}-${i}"]`)
        const v = el ? toNumber(el.value) : p
        return Number.isFinite(v) ? v : p
      })
    })
    try {
      this.svg = membershipSvg(variable, null)
    } catch {
      this.svg = ''
    }
  },
}))

/* ------------------------------------------------------------------------
 * Tombol salin tautan
 * ---------------------------------------------------------------------- */
Alpine.data('copyLink', () => ({
  copied: false,
  async copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      this.copied = true
      setTimeout(() => (this.copied = false), 2000)
    } catch {
      window.prompt('Salin tautan ini:', window.location.href)
    }
  },
}))

/* ------------------------------------------------------------------------
 * Bawaan starter kit
 * ---------------------------------------------------------------------- */
Alpine.data('alert', function () {
  return {
    isVisible: false,
    dismiss() {
      this.isVisible = false
    },
    init() {
      setTimeout(() => {
        this.isVisible = true
      }, 80)
      setTimeout(() => {
        this.dismiss()
      }, 6000)
    },
  }
})

Alpine.data('themeToggle', function () {
  return {
    theme: 'light',
    init() {
      this.theme = this.$el.dataset.initialTheme || 'light'
    },
    toggle() {
      const next = this.theme === 'dark' ? 'light' : 'dark'
      this.theme = next
      document.documentElement.setAttribute('data-theme', next)
      document.cookie = `app_theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    },
  }
})

Alpine.start()
