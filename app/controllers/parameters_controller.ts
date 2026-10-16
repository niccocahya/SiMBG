import { readFile } from 'node:fs/promises'
import type { HttpContext } from '@adonisjs/core/http'
import { checkConfig, defaultConfig, type ConfigIssue, type FuzzyConfig } from '#fuzzy/index'
import ExpertCase from '#models/expert_case'
import ParameterSet from '#models/parameter_set'
import ParameterService from '#services/parameter_service'
import { measureAgreement } from '#services/expert_agreement_service'
import { parameterMetaValidator } from '#validators/misc'

export default class ParametersController {
  /** F-09: daftar set parameter */
  async index({ view }: HttpContext) {
    await ParameterService.ensureDefault()
    const active = await ParameterService.active()
    const sets = await ParameterSet.query().orderBy('is_locked', 'desc').orderBy('created_at', 'desc')
    return view.render('pages/parameters/index', { sets, active })
  }

  /**
   * Render form. Saat validasi gagal, halaman dirender langsung dengan
   * isian terakhir (tanpa redirect), karena draf parameter terlalu besar
   * untuk disimpan di cookie sesi.
   */
  private async renderForm(
    view: HttpContext['view'],
    set: ParameterSet,
    draft?: FuzzyConfig,
    issues: ConfigIssue[] = []
  ) {
    const active = await ParameterService.active()

    // Dampak terhadap uji pakar (F-14), dibandingkan dengan set aktif
    const cases = await ExpertCase.all()
    const agreement = cases.length ? measureAgreement(set.config, cases) : null
    const activeAgreement = cases.length && active.id !== set.id ? measureAgreement(active.config, cases) : null

    return view.render('pages/parameters/show', {
      set,
      active,
      config: draft ?? set.config,
      issues,
      agreement,
      activeAgreement,
    })
  }

  /** Lihat / ubah satu set. Set terkunci hanya bisa dibaca. */
  async show({ params, view }: HttpContext) {
    const set = await ParameterSet.findOrFail(params.id)
    return this.renderForm(view, set)
  }

  /** Buat salinan dari set lain (atau dari default). */
  async store({ request, response, session, deviceId }: HttpContext) {
    const fromId = request.input('from')
    const from = fromId ? await ParameterSet.find(fromId) : null
    const set = await ParameterSet.create({
      name: `${from ? from.name : 'Default PRD'} (salinan)`.slice(0, 120),
      description: from?.description ?? null,
      config: from ? from.config : defaultConfig(),
      isLocked: false,
      isActive: false,
      deviceId,
    })
    session.flash('success', 'Salinan dibuat. Ubah angkanya lalu simpan.')
    return response.redirect().toRoute('parameters.show', { id: set.id })
  }

  async update({ params, request, response, session, view }: HttpContext) {
    const set = await ParameterSet.findOrFail(params.id)
    if (set.isLocked) {
      session.flash('error', 'Set default terkunci. Buat salinan untuk mengubahnya.')
      return response.redirect().back()
    }

    const meta = await request.validateUsing(parameterMetaValidator)
    // Baris kelompok sasaran yang kode dan namanya kosong dianggap dihapus / tidak ditambahkan
    const raw = { ...(request.input('config') ?? {}) }
    if (raw.targetGroups && typeof raw.targetGroups === 'object') {
      raw.targetGroups = Object.values(raw.targetGroups).filter((g: any) => g?.code || g?.label)
    }
    const check = checkConfig(raw)
    if (!check.ok) {
      response.status(422)
      set.name = meta.name
      set.description = meta.description ?? null
      return this.renderForm(view, set, check.draft, check.issues)
    }

    set.merge({ name: meta.name, description: meta.description ?? null, config: check.config })
    await set.save()
    session.flash('success', set.isActive ? 'Parameter disimpan dan langsung dipakai.' : 'Parameter disimpan.')
    return response.redirect().toRoute('parameters.show', { id: set.id })
  }

  async activate({ params, response, session }: HttpContext) {
    const set = await ParameterSet.findOrFail(params.id)
    await ParameterService.activate(set)
    session.flash('success', `"${set.name}" sekarang dipakai untuk evaluasi baru.`)
    return response.redirect().back()
  }

  /** Kembali memakai set "Default PRD". */
  async reset({ response, session }: HttpContext) {
    const set = await ParameterService.ensureDefault()
    await ParameterService.activate(set)
    session.flash('success', 'Kembali memakai parameter Default PRD.')
    return response.redirect().toRoute('parameters.index')
  }

  async destroy({ params, response, session }: HttpContext) {
    const set = await ParameterSet.findOrFail(params.id)
    if (set.isLocked || set.isActive) {
      session.flash('error', 'Set default atau set yang sedang aktif tidak bisa dihapus.')
      return response.redirect().back()
    }
    await set.delete()
    session.flash('success', 'Set parameter dihapus. Riwayat yang memakainya tetap menyimpan salinannya.')
    return response.redirect().toRoute('parameters.index')
  }

  async export({ params, response }: HttpContext) {
    const set = await ParameterSet.findOrFail(params.id)
    const slug = set.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'parameter'
    response.header('Content-Type', 'application/json; charset=utf-8')
    response.header('Content-Disposition', `attachment; filename="parameter-${slug}.json"`)
    return JSON.stringify({ name: set.name, description: set.description, config: set.config }, null, 2)
  }

  /** Impor JSON (berkas atau tempel teks) sebagai set baru. */
  async import({ request, response, session, deviceId }: HttpContext) {
    const file = request.file('file', { extnames: ['json', 'txt'], size: '512kb' })
    let text = String(request.input('json', '') || '')
    if (file) {
      if (!file.isValid || !file.tmpPath) {
        session.flash('error', file.errors[0]?.message ?? 'Berkas tidak valid.')
        return response.redirect().back()
      }
      text = await readFile(file.tmpPath, 'utf8')
    }

    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      session.flash('error', 'Isi bukan JSON yang valid.')
      return response.redirect().back()
    }

    const check = checkConfig(parsed?.config ?? parsed)
    if (!check.ok) {
      session.flash('error', `Impor gagal: ${check.issues.slice(0, 3).map((i) => i.message).join(' ')}`)
      return response.redirect().back()
    }

    const set = await ParameterSet.create({
      name: String(parsed?.name || 'Parameter impor').slice(0, 110) + ' (impor)',
      description: typeof parsed?.description === 'string' ? parsed.description.slice(0, 1000) : null,
      config: check.config,
      isLocked: false,
      isActive: false,
      deviceId,
    })
    session.flash('success', 'Parameter berhasil diimpor sebagai set baru.')
    return response.redirect().toRoute('parameters.show', { id: set.id })
  }
}
