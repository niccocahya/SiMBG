import type { HttpContext } from '@adonisjs/core/http'
import Evaluation from '#models/evaluation'
import ParameterService from '#services/parameter_service'
import { toCsv } from '#services/csv'
import { historyFilterValidator } from '#validators/evaluation'

export default class HistoryController {
  private async filtered(ctx: HttpContext) {
    const filters = await historyFilterValidator.validate(ctx.request.qs())
    const query = Evaluation.query().withScopes((s) => s.visible())

    if (filters.q) query.whereLike('menu_name', `%${filters.q}%`)
    if (filters.category) query.where('category', filters.category)
    if (filters.group) query.where('group_code', filters.group)
    if (filters.mine) query.where('device_id', ctx.deviceId)

    switch (filters.sort) {
      case 'terlama':
        query.orderBy('created_at', 'asc').orderBy('id', 'asc')
        break
      case 'skor_tinggi':
        query.orderBy('score', 'desc').orderBy('id', 'desc')
        break
      case 'skor_rendah':
        query.orderBy('score', 'asc').orderBy('id', 'desc')
        break
      default:
        query.orderBy('created_at', 'desc').orderBy('id', 'desc')
    }
    return { filters, query }
  }

  /** F-08: daftar riwayat dengan filter */
  async index(ctx: HttpContext) {
    const { filters, query } = await this.filtered(ctx)
    const page = await query.paginate(filters.page ?? 1, 20)
    page.baseUrl('/riwayat').queryString({ ...ctx.request.qs(), page: undefined })
    const active = await ParameterService.active()

    return ctx.view.render('pages/history/index', {
      page,
      filters,
      groups: active.config.targetGroups,
      categories: active.config.categories,
    })
  }

  /** F-12: ekspor riwayat terfilter, satu baris per evaluasi */
  async csv(ctx: HttpContext) {
    const { query } = await this.filtered(ctx)
    const rows = await query.limit(5000)
    ctx.response.header('Content-Type', 'text/csv; charset=utf-8')
    ctx.response.header('Content-Disposition', 'attachment; filename="riwayat-evaluasi.csv"')
    return toCsv(
      [
        'Tanggal',
        'Menu',
        'Kelompok',
        'Jenis kelamin',
        'Kalori (kkal)',
        'Protein (g)',
        'Lemak (g)',
        'Serat (g)',
        'Kalori (%)',
        'Protein (%)',
        'Lemak (%)',
        'Serat (%)',
        'Skor kecukupan',
        'Skor akhir',
        'Kategori',
        'Alasan',
        'Parameter',
        'Tautan',
      ],
      rows.map((e) => [
        e.createdAt.toFormat('yyyy-MM-dd HH:mm'),
        e.displayName,
        e.groupLabel,
        e.sex,
        e.kalori,
        e.protein,
        e.lemak,
        e.serat,
        Number(e.result.percent.kalori.toFixed(2)),
        Number(e.result.percent.protein.toFixed(2)),
        Number(e.result.percent.lemak.toFixed(2)),
        Number(e.result.percent.serat.toFixed(2)),
        Number(e.scoreAdequacy.toFixed(2)),
        Number(e.score.toFixed(2)),
        e.result.categoryLabel,
        e.result.reasons.map((r) => r.text).join('; '),
        e.parameterSetName,
        `/evaluasi/${e.uuid}`,
      ])
    )
  }

  /** F-11: bandingkan beberapa evaluasi yang dicentang di riwayat */
  async compare({ request, view, response, session }: HttpContext) {
    const raw = request.input('ids', [])
    const ids = (Array.isArray(raw) ? raw : String(raw).split(','))
      .map((s: string) => String(s).trim())
      .filter((s: string) => /^[0-9a-f-]{36}$/.test(s))
      .slice(0, 7)

    if (ids.length < 2) {
      session.flash('error', 'Pilih minimal dua evaluasi untuk dibandingkan.')
      return response.redirect().toRoute('history.index')
    }

    const found = await Evaluation.query().withScopes((s) => s.visible()).whereIn('uuid', ids)
    const evaluations = ids.map((id) => found.find((e) => e.uuid === id)).filter(Boolean) as Evaluation[]
    return view.render('pages/history/compare', { evaluations, title: 'Perbandingan menu' })
  }
}
