import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import { NUTRIENTS, portionTarget, type NutritionValues, type Sex } from '#fuzzy/index'
import Evaluation from '#models/evaluation'
import Ingredient from '#models/ingredient'
import type ParameterSet from '#models/parameter_set'
import EvaluationService, { type EvaluationInput } from '#services/evaluation_service'
import ParameterService from '#services/parameter_service'
import { calculateItems } from '#services/ingredient_calculator'
import { toCsv } from '#services/csv'
import {
  computeValidator,
  evaluationValidator,
  ingredientEvaluationValidator,
  LIMITS,
} from '#validators/evaluation'

/**
 * Menu contoh untuk tombol "Isi contoh". Dinyatakan dalam % target supaya
 * berlaku untuk kelompok sasaran mana pun; form mengubahnya ke kkal/gram.
 */
const SAMPLES = [
  {
    name: 'Contoh PRD: lauk goreng, sayur sedikit',
    percent: { kalori: 95, protein: 80, lemak: 120, serat: 55 },
  },
  {
    name: 'Nasi, ikan kukus, sayur bayam, buah',
    percent: { kalori: 100, protein: 105, lemak: 95, serat: 105 },
  },
  {
    name: 'Nasi uduk, nugget goreng, kerupuk',
    percent: { kalori: 125, protein: 70, lemak: 180, serat: 20 },
  },
  {
    name: 'Nasi sedikit, sayur bening',
    percent: { kalori: 60, protein: 45, lemak: 40, serat: 90 },
  },
]

/** Target porsi untuk semua kelompok dan jenis kelamin (dipakai form untuk menghitung % secara langsung). */
function allTargets(set: ParameterSet) {
  const out: Record<string, Record<Sex, NutritionValues>> = {}
  for (const group of set.config.targetGroups) {
    out[group.code] = {
      avg: portionTarget(set.config, group.code, 'avg'),
      L: portionTarget(set.config, group.code, 'L'),
      P: portionTarget(set.config, group.code, 'P'),
    }
  }
  return out
}

async function findVisible(uuid: string) {
  return Evaluation.query().withScopes((s) => s.visible()).where('uuid', uuid).firstOrFail()
}

export default class EvaluationsController {
  /** F-01: form input */
  async create({ view, request }: HttpContext) {
    const parameterSet = await ParameterService.active()
    const ingredients = await Ingredient.query().orderBy('category').orderBy('name')

    const fromUuid = request.input('dari')
    const from = fromUuid
      ? await Evaluation.query().withScopes((s) => s.visible()).where('uuid', fromUuid).first()
      : null

    return view.render('pages/evaluations/create', {
      parameterSet,
      groups: parameterSet.config.targetGroups,
      targets: allTargets(parameterSet),
      ingredients: ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        kalori: i.kalori,
        protein: i.protein,
        lemak: i.lemak,
        serat: i.serat,
        source: i.source,
      })),
      samples: SAMPLES,
      limits: LIMITS,
      from,
    })
  }

  /** F-02 + F-03: validasi, hitung, simpan */
  async store({ request, response, deviceId, session }: HttpContext) {
    const parameterSet = await ParameterService.active()
    const fromIngredients = request.input('mode') === 'bahan'

    let input: EvaluationInput
    if (fromIngredients) {
      const payload = await request.validateUsing(ingredientEvaluationValidator)
      const calc = await calculateItems(payload.items)
      if (!calc.items.length) {
        session.flash('error', 'Bahan yang dipilih tidak ditemukan.')
        return response.redirect().back()
      }
      const tooHigh = NUTRIENTS.find((n) => calc.totals[n] > LIMITS[n].max)
      if (calc.totals.kalori < LIMITS.kalori.min || tooHigh) {
        session.flashAll()
        session.flash(
          'error',
          tooHigh
            ? `Total ${tooHigh} dari bahan melebihi batas wajar satu porsi. Periksa beratnya.`
            : 'Total kalori dari bahan terlalu kecil. Tambah bahan atau beratnya.'
        )
        return response.redirect().back()
      }
      input = { ...payload, values: calc.totals, items: calc.items, source: 'bahan' }
    } else {
      const payload = await request.validateUsing(evaluationValidator)
      input = {
        ...payload,
        values: { kalori: payload.kalori, protein: payload.protein, lemak: payload.lemak, serat: payload.serat },
        items: null,
        source: request.input('source') === 'simulasi' ? 'simulasi' : 'manual',
      }
    }

    const evaluation = await EvaluationService.create(input, parameterSet, deviceId)
    return response.redirect().toRoute('evaluations.show', { uuid: evaluation.uuid })
  }

  /** F-04, F-05, F-06, F-13: hasil, langkah hitung, grafik, simulasi */
  async show({ params, view }: HttpContext) {
    const evaluation = await findVisible(params.uuid)
    const active = await ParameterService.active()
    const outdated = JSON.stringify(evaluation.parameterSnapshot) !== JSON.stringify(active.config)
    return view.render('pages/evaluations/show', { evaluation, active, outdated })
  }

  /** F-12: versi cetak, disimpan sebagai PDF dari dialog cetak browser */
  async print({ params, view }: HttpContext) {
    const evaluation = await findVisible(params.uuid)
    return view.render('pages/evaluations/print', { evaluation })
  }

  /** F-12: CSV satu evaluasi lengkap dengan jejak hitung */
  async csv({ params, response }: HttpContext) {
    const e = await findVisible(params.uuid)
    const r = e.result
    const rows: unknown[][] = [
      ['Menu', e.displayName],
      ['Kelompok sasaran', e.groupLabel],
      ['Parameter', e.parameterSetName],
      ['Dibuat', e.createdAt.toISO()],
      [],
      ['Kandungan', 'Nilai', 'Target porsi', '% target'],
      ...NUTRIENTS.map((n) => [n, e.values[n], e.target[n], r.percent[n]]),
      [],
      ['Tahap', 'Variabel', 'Himpunan', 'μ'],
      ...[r.stage1, r.stage2].flatMap((stage, si) =>
        stage.inputs.flatMap((input) =>
          input.memberships.map((m) => [si + 1, input.label, m.label, m.mu])
        )
      ),
      [],
      ['Tahap', 'Aturan', 'Kondisi', 'α', 'z', 'α×z'],
      ...[r.stage1, r.stage2].flatMap((stage, si) =>
        stage.rules
          .filter((rule) => rule.alpha > 0)
          .map((rule) => [
            si + 1,
            rule.id,
            Object.entries(rule.when).map(([k, v]) => `${k}=${v}`).join(' & '),
            rule.alpha,
            rule.z,
            rule.alphaZ,
          ])
      ),
      [],
      ['Skor kecukupan', r.stage1.output],
      ['Skor akhir', r.score],
      ['Kategori', r.categoryLabel],
      ['Alasan', r.reasons.map((x) => x.text).join('; ')],
      ['Catatan', 'Alat bantu keputusan, bukan penilaian atau sertifikasi resmi program MBG.'],
    ]
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', `attachment; filename="evaluasi-${e.uuid.slice(0, 8)}.csv"`)
    return toCsv(['Evaluasi Kelayakan Gizi Menu MBG', ''], rows)
  }

  /** Hitung ulang dengan parameter aktif → evaluasi baru; yang lama tidak diubah. */
  async recompute({ params, response, deviceId }: HttpContext) {
    const old = await findVisible(params.uuid)
    const parameterSet = await ParameterService.active()
    const evaluation = await EvaluationService.create(
      {
        menuName: old.menuName,
        groupCode: parameterSet.config.targetGroups.some((g) => g.code === old.groupCode)
          ? old.groupCode
          : parameterSet.config.targetGroups[0].code,
        sex: old.sex,
        values: old.values,
        items: old.items,
        source: 'hitung_ulang',
      },
      parameterSet,
      deviceId
    )
    return response.redirect().toRoute('evaluations.show', { uuid: evaluation.uuid })
  }

  /** F-08: hapus (soft delete), hanya dari perangkat pembuat */
  async destroy({ params, response, deviceId, session }: HttpContext) {
    const evaluation = await findVisible(params.uuid)
    if (evaluation.deviceId !== deviceId) {
      session.flash('error', 'Evaluasi ini hanya bisa dihapus dari perangkat yang membuatnya.')
      return response.redirect().back()
    }
    evaluation.deletedAt = DateTime.now()
    await evaluation.save()
    session.flash('success', 'Evaluasi dihapus dari riwayat.')
    return response.redirect().toRoute('history.index')
  }

  /** Endpoint JSON tanpa simpan, untuk integrasi dan pengujian. */
  async compute({ request }: HttpContext) {
    const payload = await request.validateUsing(computeValidator)
    const parameterSet = await ParameterService.active()
    const { group, target, percent, result } = EvaluationService.compute(
      parameterSet.config,
      payload.groupCode,
      payload.sex,
      { kalori: payload.kalori, protein: payload.protein, lemak: payload.lemak, serat: payload.serat }
    )
    return { group: { code: group.code, label: group.label }, target, percent, result, parameterSet: parameterSet.name }
  }
}
