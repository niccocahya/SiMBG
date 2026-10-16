import type { HttpContext } from '@adonisjs/core/http'
import { portionTarget } from '#fuzzy/index'
import ParameterService from '#services/parameter_service'

export default class PagesController {
  /** F-15: penjelasan metode, membaca parameter yang sedang aktif */
  async about({ view }: HttpContext) {
    const active = await ParameterService.active()
    const targets = active.config.targetGroups.map((g) => ({
      group: g,
      target: portionTarget(active.config, g.code, 'avg'),
    }))
    return view.render('pages/about', { active, config: active.config, targets })
  }
}
