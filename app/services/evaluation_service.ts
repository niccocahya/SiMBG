import { randomUUID } from 'node:crypto'
import {
  evaluate,
  findGroup,
  portionTarget,
  toPercent,
  type FuzzyConfig,
  type NutritionValues,
  type Sex,
} from '#fuzzy/index'
import Evaluation, { type EvaluationItem, type EvaluationSource } from '#models/evaluation'
import type ParameterSet from '#models/parameter_set'

export interface EvaluationInput {
  menuName?: string | null
  groupCode: string
  sex: Sex
  values: NutritionValues
  items?: EvaluationItem[] | null
  source: EvaluationSource
}

export default class EvaluationService {
  /** Hitung tanpa menyimpan: nilai mutlak → % target porsi → mesin fuzzy. */
  static compute(config: FuzzyConfig, groupCode: string, sex: Sex, values: NutritionValues) {
    const group = findGroup(config, groupCode)
    const target = portionTarget(config, group.code, sex)
    const percent = toPercent(values, target)
    const result = evaluate(percent, config)
    return { group, target, percent, result }
  }

  static async create(input: EvaluationInput, parameterSet: ParameterSet, deviceId: string | null) {
    const config = parameterSet.config
    const { group, target, result } = this.compute(config, input.groupCode, input.sex, input.values)

    return Evaluation.create({
      uuid: randomUUID(),
      menuName: input.menuName?.trim() || null,
      groupCode: group.code,
      groupLabel: group.label,
      sex: input.sex,
      ...input.values,
      scoreAdequacy: result.stage1.output,
      score: result.score,
      category: result.category,
      target,
      result,
      parameterSnapshot: config,
      parameterSetId: parameterSet.id,
      parameterSetName: parameterSet.name,
      items: input.items?.length ? input.items : null,
      source: input.source,
      deviceId,
    })
  }
}
