import db from '@adonisjs/lucid/services/db'
import { defaultConfig } from '#fuzzy/index'
import ParameterSet from '#models/parameter_set'

export const DEFAULT_SET_NAME = 'Default PRD'

export default class ParameterService {
  /** Set parameter aktif. Jika belum ada sama sekali, set default dibuat otomatis. */
  static async active(): Promise<ParameterSet> {
    const active = await ParameterSet.query().where('is_active', true).first()
    if (active) return active
    const fallback = await this.ensureDefault()
    fallback.isActive = true
    await fallback.save()
    return fallback
  }

  static async ensureDefault(): Promise<ParameterSet> {
    const existing = await ParameterSet.query().where('is_locked', true).first()
    if (existing) return existing
    const hasActive = await ParameterSet.query().where('is_active', true).first()
    return ParameterSet.create({
      name: DEFAULT_SET_NAME,
      description: 'Parameter awal sesuai PRD. Terkunci; buat salinan untuk mengubahnya.',
      config: defaultConfig(),
      isLocked: true,
      isActive: !hasActive,
      deviceId: null,
    })
  }

  static async activate(set: ParameterSet) {
    await db.transaction(async (trx) => {
      await ParameterSet.query({ client: trx }).update({ is_active: false })
      set.useTransaction(trx)
      set.isActive = true
      await set.save()
    })
  }
}
