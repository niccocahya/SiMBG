import { test } from '@japa/runner'
import {
  defaultConfig,
  evaluate,
  FuzzyCoverageError,
  portionTarget,
  toPercent,
  type NutritionValues,
} from '#fuzzy/index'

const config = defaultConfig()
const TOL = 0.01

const run = (kalori: number, protein: number, lemak: number, serat: number) =>
  evaluate({ kalori, protein, lemak, serat }, config)

function activeRules(stage: { rules: { id: string; alpha: number; z: number }[] }) {
  return stage.rules.filter((r) => r.alpha > 0).map((r) => ({ id: r.id, alpha: r.alpha, z: r.z }))
}

test.group('Mesin Sugeno | contoh hitung PRD (kasus uji pertama)', () => {
  const result = run(95, 80, 120, 55)

  test('tahap 1: derajat keanggotaan kalori dan protein', ({ assert }) => {
    const [kalori, protein] = result.stage1.inputs
    assert.closeTo(kalori.memberships.find((m) => m.set === 'cukup')!.mu, 1, TOL)
    assert.closeTo(protein.memberships.find((m) => m.set === 'kurang')!.mu, 0.2, TOL)
    assert.closeTo(protein.memberships.find((m) => m.set === 'cukup')!.mu, 0.8, TOL)
  })

  test('tahap 1: dua aturan aktif dan skor kecukupan 89', ({ assert }) => {
    const active = activeRules(result.stage1)
    assert.lengthOf(active, 2)
    assert.closeTo(active.find((r) => r.z === 45)!.alpha, 0.2, TOL)
    assert.closeTo(active.find((r) => r.z === 100)!.alpha, 0.8, TOL)
    assert.closeTo(result.stage1.output, 89, TOL)
  })

  test('tahap 2: empat aturan aktif dengan α = 0,5', ({ assert }) => {
    const active = activeRules(result.stage2)
    assert.lengthOf(active, 4)
    for (const rule of active) assert.closeTo(rule.alpha, 0.5, TOL)
    assert.sameMembers(
      active.map((r) => r.z),
      [75, 75, 20, 50]
    )
    assert.closeTo(result.stage2.sumAlpha, 2, TOL)
    assert.closeTo(result.stage2.sumAlphaZ, 110, TOL)
  })

  test('skor akhir 55 persis, kategori Perlu Perbaikan', ({ assert }) => {
    assert.closeTo(result.score, 55, 1e-9)
    assert.equal(result.category, 'perlu_perbaikan')
  })

  test('alasan: lemak berlebih dan serat masih di bawah target', ({ assert }) => {
    const problems = result.reasons.filter((r) => r.severity === 'masalah').map((r) => r.text)
    assert.deepEqual(problems, ['lemak berlebih', 'serat masih di bawah target'])
  })
})

test.group('Mesin Sugeno | kasus PRD dari nilai kkal/gram (lewat konversi persen)', () => {
  test('SD 7–9 th: 470,25 kkal; 9,6 g; 19,8 g; 3,795 g → skor 55 dan urutan alasan stabil', ({ assert }) => {
    const target = portionTarget(config, 'sd_7_9', 'avg')
    const percent = toPercent({ kalori: 470.25, protein: 9.6, lemak: 19.8, serat: 3.795 }, target)
    const r = evaluate(percent, config)
    assert.closeTo(r.score, 55, TOL)
    const problems = r.reasons.filter((x) => x.severity === 'masalah').map((x) => x.text)
    assert.deepEqual(problems, ['lemak berlebih', 'serat masih di bawah target'])
  })
})

test.group('Mesin Sugeno | kasus khusus', () => {
  test('menu ideal 100/100/100/100 → kecukupan 100, skor 95, Sangat Layak', ({ assert }) => {
    const r = run(100, 100, 100, 100)
    assert.closeTo(r.stage1.output, 100, TOL)
    assert.closeTo(r.score, 95, TOL)
    assert.equal(r.category, 'sangat_layak')
    assert.equal(r.reasons[0].code, 'seimbang')
  })

  test('semua nol → kecukupan 10, skor 20, Tidak Layak', ({ assert }) => {
    const r = run(0, 0, 0, 0)
    assert.closeTo(r.stage1.output, 10, TOL)
    assert.closeTo(r.score, 20, TOL)
    assert.equal(r.category, 'tidak_layak')
  })

  test('semua 200% → kalori berlebih + protein tinggi = 55; lemak berlebih menahan skor', ({ assert }) => {
    const r = run(200, 200, 200, 200)
    assert.closeTo(r.stage1.output, 55, TOL)
    assert.isAtMost(r.score, 50 + TOL)
  })

  test('nilai di atas domain dipotong ke 200 dan ditandai', ({ assert }) => {
    const r = run(350, 100, 100, 100)
    const kalori = r.stage1.inputs[0]
    assert.equal(kalori.raw, 350)
    assert.equal(kalori.value, 200)
    assert.isTrue(kalori.clipped)
    assert.deepEqual(r.percent.kalori, 350)
  })

  test('kalori cukup dan protein tinggi → 85', ({ assert }) => {
    assert.closeTo(run(100, 150, 100, 100).stage1.output, 85, TOL)
  })

  test('aturan aktif dihitung dengan operator minimum', ({ assert }) => {
    const r = run(80, 100, 100, 100)
    // kalori 80: kurang 0,5 dan cukup 0,5; protein 100: cukup 1
    const active = activeRules(r.stage1)
    assert.lengthOf(active, 2)
    for (const rule of active) assert.closeTo(rule.alpha, 0.5, TOL)
    assert.closeTo(r.stage1.output, (0.5 * 40 + 0.5 * 100) / 1, TOL)
  })

  test('Σα = 0 memunculkan FuzzyCoverageError, bukan skor 0 diam-diam', ({ assert }) => {
    const broken = defaultConfig()
    broken.variables.kalori.sets[1].params = [95, 96, 97, 98]
    broken.variables.kalori.sets[0].params = [0, 0, 10, 20]
    broken.variables.kalori.sets[2].params = [150, 160, 200, 200]
    assert.throws(() => evaluate({ kalori: 50, protein: 100, lemak: 100, serat: 100 }, broken), FuzzyCoverageError as any)
  })
})

test.group('Mesin Sugeno | sifat yang harus selalu benar (property test)', () => {
  function random(): NutritionValues {
    const r = () => Math.round(Math.random() * 2500) / 10
    return { kalori: r(), protein: r(), lemak: r(), serat: r() }
  }

  test('skor selalu dalam [20, 95] dan Σα > 0 untuk 5000 input acak', ({ assert }) => {
    for (let i = 0; i < 5000; i++) {
      const input = random()
      const r = evaluate(input, config)
      assert.isAbove(r.stage1.sumAlpha, 0)
      assert.isAbove(r.stage2.sumAlpha, 0)
      if (r.score < 20 - 1e-9 || r.score > 95 + 1e-9) assert.fail(`skor ${r.score} untuk ${JSON.stringify(input)}`)
    }
  })

  test('prinsip 1: kecukupan Rendah murni → skor 20 apa pun lemak dan seratnya', ({ assert }) => {
    for (let i = 0; i < 500; i++) {
      const { lemak, serat } = random()
      // kalori 0 dan protein 0 → kecukupan 10 → Rendah = 1
      assert.closeTo(evaluate({ kalori: 0, protein: 0, lemak, serat }, config).score, 20, TOL)
    }
  })

  test('prinsip 2: lemak Berlebih penuh (≥ 130%) → skor paling tinggi 50', ({ assert }) => {
    for (let i = 0; i < 1000; i++) {
      const input = random()
      input.lemak = 130 + Math.random() * 100
      const r = evaluate(input, config)
      if (r.score > 50 + 1e-9) assert.fail(`skor ${r.score} untuk ${JSON.stringify(input)}`)
    }
  })

  test('prinsip 4: skor di atas 75 hanya jika kecukupan Tinggi, lemak Cukup, dan serat Cukup aktif', ({ assert }) => {
    for (let i = 0; i < 2000; i++) {
      const r = evaluate(random(), config)
      if (r.score > 75 + 1e-9) {
        const top = r.stage2.rules.find((rule) => rule.z === 95)!
        assert.isAbove(top.alpha, 0)
      }
    }
  })
})
