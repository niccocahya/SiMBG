import { readFile } from 'node:fs/promises'
import type { HttpContext } from '@adonisjs/core/http'
import type { CategoryKey, Sex } from '#fuzzy/index'
import ExpertCase from '#models/expert_case'
import ParameterSet from '#models/parameter_set'
import ParameterService from '#services/parameter_service'
import { measureAgreement } from '#services/expert_agreement_service'
import { parseCsv, parseDecimal, toCsv } from '#services/csv'
import { expertCaseValidator } from '#validators/misc'

const CATEGORY_KEYS: CategoryKey[] = ['tidak_layak', 'perlu_perbaikan', 'layak', 'sangat_layak']
const CSV_HEADER = ['name', 'group_code', 'sex', 'kalori', 'protein', 'lemak', 'serat', 'expert_category', 'expert_name', 'notes']

/** Menerima kunci kategori maupun labelnya ("Perlu Perbaikan"). */
function normalizeCategory(value: string): CategoryKey | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, '_') as CategoryKey
  return CATEGORY_KEYS.includes(key) ? key : null
}

export default class ExpertTestsController {
  /** F-14: uji kesesuaian sistem dengan penilaian pakar */
  async index({ view, request }: HttpContext) {
    const active = await ParameterService.active()
    const sets = await ParameterSet.query().orderBy('is_locked', 'desc').orderBy('created_at', 'desc')
    const chosen = sets.find((s) => String(s.id) === String(request.input('set'))) ?? active
    const compareWith = sets.find((s) => String(s.id) === String(request.input('banding')))

    const cases = await ExpertCase.query().orderBy('id')
    const report = measureAgreement(chosen.config, cases)
    const compareReport = compareWith ? measureAgreement(compareWith.config, cases) : null

    return view.render('pages/expert/index', {
      sets,
      chosen,
      compareWith,
      report,
      compareReport,
      groups: active.config.targetGroups,
      categories: active.config.categories,
    })
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(expertCaseValidator)
    await ExpertCase.create({ ...payload, expertName: payload.expertName ?? null, notes: payload.notes ?? null })
    session.flash('success', 'Menu uji ditambahkan.')
    return response.redirect().back()
  }

  async destroy({ params, response, session }: HttpContext) {
    const item = await ExpertCase.findOrFail(params.id)
    await item.delete()
    session.flash('success', 'Menu uji dihapus.')
    return response.redirect().back()
  }

  async clear({ response, session }: HttpContext) {
    await ExpertCase.query().delete()
    session.flash('success', 'Semua menu uji dihapus.')
    return response.redirect().toRoute('expert.index')
  }

  /** Impor CSV menu uji (format sama dengan templat). */
  async import({ request, response, session }: HttpContext) {
    const file = request.file('file', { extnames: ['csv', 'txt'], size: '1mb' })
    if (!file || !file.isValid || !file.tmpPath) {
      session.flash('error', file?.errors[0]?.message ?? 'Pilih berkas CSV terlebih dulu.')
      return response.redirect().back()
    }

    const rows = parseCsv(await readFile(file.tmpPath, 'utf8'))
    const valid: Partial<ExpertCase>[] = []
    const problems: string[] = []

    rows.forEach((r, i) => {
      const line = i + 2
      const values = ['kalori', 'protein', 'lemak', 'serat'].map((k) => parseDecimal(r[k]))
      const category = normalizeCategory(r.expert_category ?? '')
      if (!r.name || values.some((v) => v === null || v < 0) || !category) {
        problems.push(`baris ${line}`)
        return
      }
      valid.push({
        name: r.name.slice(0, 150),
        groupCode: (r.group_code || 'sd_7_9').slice(0, 40),
        sex: (['avg', 'L', 'P'].includes(r.sex) ? r.sex : 'avg') as Sex,
        kalori: values[0]!,
        protein: values[1]!,
        lemak: values[2]!,
        serat: values[3]!,
        expertCategory: category,
        expertName: r.expert_name?.slice(0, 120) || null,
        notes: r.notes?.slice(0, 500) || null,
      })
    })

    if (valid.length) await ExpertCase.createMany(valid)
    const msg = `${valid.length} menu uji diimpor.`
    if (problems.length) {
      session.flash('error', `${msg} ${problems.length} baris dilewati (${problems.slice(0, 5).join(', ')}): periksa angka dan kategori.`)
    } else {
      session.flash('success', msg)
    }
    return response.redirect().toRoute('expert.index')
  }

  async template({ response }: HttpContext) {
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', 'attachment; filename="templat-menu-uji.csv"')
    return toCsv(CSV_HEADER, [
      ['Nasi, ikan kukus, sayur bayam, pisang', 'sd_7_9', 'avg', 500, 12.5, 16, 7.2, 'sangat_layak', 'Nama pakar', ''],
    ])
  }

  /** Hasil uji untuk lampiran laporan. */
  async export({ request, response }: HttpContext) {
    const active = await ParameterService.active()
    const setId = Number(request.input('set'))
    const chosen = (Number.isInteger(setId) && setId > 0 ? await ParameterSet.find(setId) : null) ?? active
    const report = measureAgreement(chosen.config, await ExpertCase.query().orderBy('id'))
    const label = (key: string | null) => chosen.config.categories.find((c) => c.key === key)?.label ?? '–'

    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', 'attachment; filename="hasil-uji-pakar.csv"')
    return toCsv(
      ['Menu', 'Kelompok', 'Kalori', 'Protein', 'Lemak', 'Serat', 'Kategori pakar', 'Skor sistem', 'Kategori sistem', 'Sesuai', 'Pakar'],
      [
        ...report.rows.map((r) => [
          r.case.name,
          r.case.groupCode,
          r.case.kalori,
          r.case.protein,
          r.case.lemak,
          r.case.serat,
          label(r.case.expertCategory),
          r.score === null ? '' : Number(r.score.toFixed(2)),
          label(r.systemCategory),
          r.match ? 'ya' : 'tidak',
          r.case.expertName ?? '',
        ]),
        [],
        ['Parameter', chosen.name],
        ['Kesesuaian', `${report.matches} dari ${report.total} (${report.percent.toFixed(1).replace('.', ',')}%)`],
      ]
    )
  }
}
