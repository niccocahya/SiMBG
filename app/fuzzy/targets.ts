import type { Akg, FuzzyConfig, NutrientKey, NutritionValues, Sex, TargetGroup } from './types.js'

export const NUTRIENTS: NutrientKey[] = ['kalori', 'protein', 'lemak', 'serat']

export function findGroup(config: FuzzyConfig, code: string): TargetGroup {
  return config.targetGroups.find((g) => g.code === code) ?? config.targetGroups[0]
}

/** AKG harian sesuai jenis kelamin; "avg" = rata-rata laki-laki dan perempuan. */
export function dailyAkg(group: TargetGroup, sex: Sex): Akg {
  if (sex === 'L') return group.male
  if (sex === 'P') return group.female
  const avg = {} as Akg
  for (const n of NUTRIENTS) avg[n] = (group.male[n] + group.female[n]) / 2
  return avg
}

/** Target satu porsi = AKG harian × persen porsi. */
export function portionTarget(config: FuzzyConfig, groupCode: string, sex: Sex): NutritionValues {
  const akg = dailyAkg(findGroup(config, groupCode), sex)
  const target = {} as NutritionValues
  for (const n of NUTRIENTS) target[n] = (akg[n] * config.portionPercent) / 100
  return target
}

/** Nilai mutlak (kkal / gram) → persen target porsi. */
export function toPercent(values: NutritionValues, target: NutritionValues): NutritionValues {
  const percent = {} as NutritionValues
  for (const n of NUTRIENTS) percent[n] = target[n] > 0 ? (values[n] / target[n]) * 100 : 0
  return percent
}
