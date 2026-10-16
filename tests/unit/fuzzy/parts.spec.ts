import { test } from '@japa/runner'
import {
  checkConfig,
  defaultConfig,
  explainMembership,
  fuzzify,
  membershipSvg,
  portionTarget,
  toCategory,
  toPercent,
  trapezoid,
} from '#fuzzy/index'

const TOL = 0.01

test.group('Fungsi keanggotaan trapesium', () => {
  test('titik a, b, c, d dan lereng', ({ assert }) => {
    const p: [number, number, number, number] = [70, 90, 110, 130]
    assert.equal(trapezoid(70, p), 0)
    assert.equal(trapezoid(90, p), 1)
    assert.equal(trapezoid(110, p), 1)
    assert.equal(trapezoid(130, p), 0)
    assert.closeTo(trapezoid(80, p), 0.5, TOL)
    assert.closeTo(trapezoid(125, p), 0.25, TOL)
    assert.equal(trapezoid(10, p), 0)
    assert.equal(trapezoid(500, p), 0)
  })

  test('bahu kiri [0,0,70,90] bernilai 1 di 0', ({ assert }) => {
    assert.equal(trapezoid(0, [0, 0, 70, 90]), 1)
    assert.closeTo(trapezoid(80, [0, 0, 70, 90]), 0.5, TOL)
  })

  test('bahu kanan [110,130,200,200] bernilai 1 di 200', ({ assert }) => {
    assert.equal(trapezoid(200, [110, 130, 200, 200]), 1)
  })

  test('fuzzify memotong nilai ke domain', ({ assert }) => {
    const t = fuzzify(defaultConfig().variables.serat, -5)
    assert.equal(t.value, 0)
    assert.isTrue(t.clipped)
    assert.equal(t.memberships.find((m) => m.set === 'kurang')!.mu, 1)
  })

  test('penjelasan rumus memakai koma desimal', ({ assert }) => {
    const t = fuzzify(defaultConfig().variables.protein, 80)
    const kurang = t.memberships.find((m) => m.set === 'kurang')!
    assert.equal(explainMembership(80, kurang), '(85 − 80) / (85 − 60) = 0,2')
  })
})

test.group('Kategori', () => {
  const cats = defaultConfig().categories
  const cases: [number, string][] = [
    [20, 'tidak_layak'],
    [39.99, 'tidak_layak'],
    [40, 'perlu_perbaikan'],
    [64.99, 'perlu_perbaikan'],
    [65, 'layak'],
    [64.99999999999, 'layak'],
    [84.99, 'layak'],
    [85, 'sangat_layak'],
    [95, 'sangat_layak'],
  ]
  for (const [score, key] of cases) {
    test(`skor ${score} → ${key}`, ({ assert }) => {
      assert.equal(toCategory(score, cats).key, key)
    })
  }
})

test.group('Target porsi', () => {
  test('SD 7–9 tahun, 30% AKG', ({ assert }) => {
    const t = portionTarget(defaultConfig(), 'sd_7_9', 'avg')
    assert.closeTo(t.kalori, 495, TOL)
    assert.closeTo(t.protein, 12, TOL)
    assert.closeTo(t.lemak, 16.5, TOL)
    assert.closeTo(t.serat, 6.9, TOL)
  })

  test('rata-rata laki-laki dan perempuan', ({ assert }) => {
    const t = portionTarget(defaultConfig(), 'smp_13_15', 'avg')
    assert.closeTo(t.kalori, ((2400 + 2050) / 2) * 0.3, TOL)
  })

  test('konversi ke persen', ({ assert }) => {
    const p = toPercent({ kalori: 470.25, protein: 9.6, lemak: 19.8, serat: 3.795 }, { kalori: 495, protein: 12, lemak: 16.5, serat: 6.9 })
    assert.closeTo(p.kalori, 95, TOL)
    assert.closeTo(p.protein, 80, TOL)
    assert.closeTo(p.lemak, 120, TOL)
    assert.closeTo(p.serat, 55, TOL)
  })
})

test.group('Validasi parameter', () => {
  test('konfigurasi default lolos', ({ assert }) => {
    const r = checkConfig(defaultConfig())
    assert.isTrue(r.ok)
  })

  test('urutan a > b ditolak', ({ assert }) => {
    const c = defaultConfig()
    c.variables.lemak.sets[1].params = [90, 80, 110, 130]
    const r = checkConfig(c)
    assert.isFalse(r.ok)
    if (!r.ok) assert.isTrue(r.issues.some((i) => i.message.includes('a ≤ b ≤ c ≤ d')))
  })

  test('celah cakupan terdeteksi', ({ assert }) => {
    const c = defaultConfig()
    c.variables.kalori.sets[0].params = [0, 0, 60, 70]
    c.variables.kalori.sets[1].params = [80, 90, 110, 130]
    const r = checkConfig(c)
    assert.isFalse(r.ok)
    if (!r.ok) assert.isTrue(r.issues.some((i) => i.message.includes('celah')))
  })

  test('konstanta aturan di luar 0–100 ditolak', ({ assert }) => {
    const c = defaultConfig()
    c.stage2Rules[0].output = 120
    assert.isFalse(checkConfig(c).ok)
  })

  test('batas kategori harus menaik', ({ assert }) => {
    const c = defaultConfig()
    c.categories[2].min = 30
    assert.isFalse(checkConfig(c).ok)
  })

  test('angka dari form dengan koma diterima', ({ assert }) => {
    const c: any = defaultConfig()
    c.portionPercent = '27,5'
    const r = checkConfig(c)
    assert.isTrue(r.ok)
    if (r.ok) assert.equal(r.config.portionPercent, 27.5)
  })

  test('aturan yang hilang ditolak', ({ assert }) => {
    const r = checkConfig({ ...defaultConfig(), stage1Rules: [] })
    assert.isFalse(r.ok)
  })

  test('aturan tambahan diabaikan, jumlah tetap 9 dan 27', ({ assert }) => {
    const c = defaultConfig()
    const r = checkConfig({
      ...c,
      stage1Rules: [...c.stage1Rules, { id: 'R99', when: { kalori: 'x' }, output: 1 }],
    })
    assert.isTrue(r.ok)
    if (r.ok) {
      assert.lengthOf(r.config.stage1Rules, 9)
      assert.lengthOf(r.config.stage2Rules, 27)
    }
  })
})

test.group('Grafik SVG', () => {
  test('memuat penanda nilai dan label yang di-escape', ({ assert }) => {
    const v = defaultConfig().variables.kalori
    v.sets[0].label = '<b>x</b>'
    const svg = membershipSvg(v, 95)
    assert.include(svg, 'mf-marker')
    assert.notInclude(svg, '<b>')
  })
})
