import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import Evaluation from '#models/evaluation'
import WeeklyPlan from '#models/weekly_plan'
import WeeklyPlanDay from '#models/weekly_plan_day'
import { weeklyDayValidator, weeklyPlanValidator } from '#validators/misc'

async function findPlan(uuid: string) {
  return WeeklyPlan.query()
    .where('uuid', uuid)
    .preload('days', (q) => q.preload('evaluation').orderBy('day'))
    .firstOrFail()
}

export default class WeeklyPlansController {
  /** F-11: daftar rencana menu mingguan */
  async index({ view }: HttpContext) {
    const plans = await WeeklyPlan.query()
      .preload('days', (q) => q.preload('evaluation'))
      .orderBy('created_at', 'desc')
      .limit(100)
    return view.render('pages/weekly/index', { plans })
  }

  async store({ request, response, deviceId }: HttpContext) {
    const payload = await request.validateUsing(weeklyPlanValidator)
    const plan = await WeeklyPlan.create({ ...payload, notes: payload.notes ?? null, uuid: randomUUID(), deviceId })
    return response.redirect().toRoute('weekly.show', { uuid: plan.uuid })
  }

  async show({ params, view }: HttpContext) {
    const plan = await findPlan(params.uuid)
    const days = plan.days.filter((d) => d.evaluation && !d.evaluation.deletedAt)
    const recent = await Evaluation.query()
      .withScopes((s) => s.visible())
      .orderBy('created_at', 'desc')
      .limit(100)

    const scores = days.map((d) => d.evaluation.score)
    const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    const weakest = days.length ? days.reduce((a, b) => (b.evaluation.score < a.evaluation.score ? b : a)) : null

    return view.render('pages/weekly/show', { plan, days, recent, average, weakest })
  }

  /** Isi atau kosongkan satu hari dengan evaluasi dari riwayat. */
  async setDay({ params, request, response, session }: HttpContext) {
    const plan = await findPlan(params.uuid)
    const day = Number(params.day)
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      session.flash('error', 'Hari tidak valid.')
      return response.redirect().back()
    }

    const { evaluationUuid } = await request.validateUsing(weeklyDayValidator)
    await WeeklyPlanDay.query().where('weekly_plan_id', plan.id).where('day', day).delete()

    if (evaluationUuid) {
      const evaluation = await Evaluation.query()
        .withScopes((s) => s.visible())
        .where('uuid', evaluationUuid)
        .firstOrFail()
      await WeeklyPlanDay.create({ weeklyPlanId: plan.id, day, evaluationId: evaluation.id })
    }
    return response.redirect().toRoute('weekly.show', { uuid: plan.uuid })
  }

  async destroy({ params, response, session, deviceId }: HttpContext) {
    const plan = await WeeklyPlan.findByOrFail('uuid', params.uuid)
    if (plan.deviceId !== deviceId) {
      session.flash('error', 'Rencana ini hanya bisa dihapus dari perangkat yang membuatnya.')
      return response.redirect().back()
    }
    // SQLite tidak menjalankan ON DELETE CASCADE tanpa PRAGMA, jadi hapus hari-harinya dulu.
    await WeeklyPlanDay.query().where('weekly_plan_id', plan.id).delete()
    await plan.delete()
    session.flash('success', 'Rencana mingguan dihapus.')
    return response.redirect().toRoute('weekly.index')
  }
}
