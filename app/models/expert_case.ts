import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { CategoryKey, Sex } from '#fuzzy/index'
import { numberColumn } from './columns.js'

export default class ExpertCase extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare groupCode: string

  @column()
  declare sex: Sex

  @numberColumn()
  declare kalori: number

  @numberColumn()
  declare protein: number

  @numberColumn()
  declare lemak: number

  @numberColumn()
  declare serat: number

  @column()
  declare expertCategory: CategoryKey

  @column()
  declare expertName: string | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
