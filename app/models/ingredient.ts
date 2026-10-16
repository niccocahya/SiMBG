import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { numberColumn } from './columns.js'

export default class Ingredient extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare code: string | null

  @column()
  declare name: string

  @column()
  declare category: string

  @numberColumn()
  declare kalori: number

  @numberColumn()
  declare protein: number

  @numberColumn()
  declare lemak: number

  @numberColumn()
  declare serat: number | null

  @column()
  declare source: 'tkpi' | 'kustom'

  @column({ serializeAs: null })
  declare deviceId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
