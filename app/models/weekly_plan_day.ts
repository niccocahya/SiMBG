import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Evaluation from './evaluation.js'

export default class WeeklyPlanDay extends BaseModel {
  static table = 'weekly_plan_days'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare weeklyPlanId: number

  @column()
  declare day: number

  @column()
  declare evaluationId: number

  @belongsTo(() => Evaluation)
  declare evaluation: BelongsTo<typeof Evaluation>
}
