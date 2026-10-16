import { DateTime } from 'luxon'
import { BaseModel, column, scope } from '@adonisjs/lucid/orm'
import type { EvaluationResult, FuzzyConfig, NutritionValues, Sex } from '#fuzzy/index'
import { jsonColumn, numberColumn } from './columns.js'

export interface EvaluationItem {
  ingredientId: number | null
  name: string
  grams: number
  kalori: number
  protein: number
  lemak: number
  serat: number | null
}

export type EvaluationSource = 'manual' | 'bahan' | 'simulasi' | 'hitung_ulang'

export default class Evaluation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare uuid: string

  @column()
  declare menuName: string | null

  @column()
  declare groupCode: string

  @column()
  declare groupLabel: string

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

  @numberColumn()
  declare scoreAdequacy: number

  @numberColumn()
  declare score: number

  @column()
  declare category: string

  @jsonColumn()
  declare target: NutritionValues

  @jsonColumn()
  declare result: EvaluationResult

  @jsonColumn()
  declare parameterSnapshot: FuzzyConfig

  @column()
  declare parameterSetId: number | null

  @column()
  declare parameterSetName: string

  @jsonColumn()
  declare items: EvaluationItem[] | null

  @column()
  declare source: EvaluationSource

  @column({ serializeAs: null })
  declare deviceId: string | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static visible = scope((query) => {
    query.whereNull('deleted_at')
  })

  get values(): NutritionValues {
    return { kalori: this.kalori, protein: this.protein, lemak: this.lemak, serat: this.serat }
  }

  get displayName() {
    return this.menuName || `Menu tanpa nama #${this.id}`
  }
}
