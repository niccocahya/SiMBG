import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import WeeklyPlanDay from './weekly_plan_day.js'

export default class WeeklyPlan extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare uuid: string

  @column()
  declare name: string

  @column()
  declare notes: string | null

  @column({ serializeAs: null })
  declare deviceId: string | null

  @hasMany(() => WeeklyPlanDay)
  declare days: HasMany<typeof WeeklyPlanDay>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
