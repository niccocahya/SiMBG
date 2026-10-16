import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Ingredient from '#models/ingredient'
import ExpertCase from '#models/expert_case'
import ParameterService from '#services/parameter_service'
import { parseCsv, parseDecimal } from '#services/csv'
import type { CategoryKey, Sex } from '#fuzzy/index'

/**
 * Data acuan awal. Aman dijalankan berulang: setiap bagian hanya diisi
 * jika tabelnya masih kosong.
 */
export default class MainSeeder extends BaseSeeder {
  async run() {
    await ParameterService.ensureDefault()
    await ParameterService.active()

    if (!(await Ingredient.query().where('source', 'tkpi').first())) {
      const rows = parseCsv(await readFile(app.makePath('database/data/tkpi_subset.csv'), 'utf8'))
      await Ingredient.createMany(
        rows.map((r) => ({
          code: r.code,
          name: r.name,
          category: r.category,
          kalori: parseDecimal(r.kalori) ?? 0,
          protein: parseDecimal(r.protein) ?? 0,
          lemak: parseDecimal(r.lemak) ?? 0,
          serat: parseDecimal(r.serat),
          source: 'tkpi' as const,
          deviceId: null,
        }))
      )
    }

    if (!(await ExpertCase.query().first())) {
      const rows = parseCsv(await readFile(app.makePath('database/data/menu_uji_contoh.csv'), 'utf8'))
      await ExpertCase.createMany(
        rows.map((r) => ({
          name: r.name,
          groupCode: r.group_code,
          sex: (r.sex || 'avg') as Sex,
          kalori: parseDecimal(r.kalori) ?? 0,
          protein: parseDecimal(r.protein) ?? 0,
          lemak: parseDecimal(r.lemak) ?? 0,
          serat: parseDecimal(r.serat) ?? 0,
          expertCategory: r.expert_category as CategoryKey,
          expertName: r.expert_name || null,
          notes: r.notes || null,
        }))
      )
    }
  }
}
