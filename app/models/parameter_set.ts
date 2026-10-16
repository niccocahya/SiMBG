import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { FuzzyConfig } from '#fuzzy/index'
import { booleanColumn, jsonColumn } from './columns.js'

export default class ParameterSet extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @jsonColumn()
  declare config: FuzzyConfig

  @booleanColumn()
  declare isLocked: boolean

  @booleanColumn()
  declare isActive: boolean

  @column({ serializeAs: null })
  declare deviceId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
