import type { HttpContext } from '@adonisjs/core/http'
import Ingredient from '#models/ingredient'
import { ingredientValidator } from '#validators/misc'

export default class IngredientsController {
  /** F-07: daftar bahan dari tabel komposisi pangan + bahan buatan pengguna */
  async index({ view, request }: HttpContext) {
    const q = String(request.input('q', '')).trim().slice(0, 100)
    const category = String(request.input('kategori', '')).trim().slice(0, 60)

    const query = Ingredient.query().orderBy('category').orderBy('name')
    if (q) query.whereLike('name', `%${q}%`)
    if (category) query.where('category', category)

    const [ingredients, categories] = await Promise.all([
      query,
      Ingredient.query().distinct('category').orderBy('category'),
    ])

    return view.render('pages/ingredients/index', {
      ingredients,
      categories: categories.map((c) => c.category),
      q,
      category,
    })
  }

  async store({ request, response, session, deviceId }: HttpContext) {
    const payload = await request.validateUsing(ingredientValidator)
    await Ingredient.create({
      ...payload,
      serat: payload.serat ?? null,
      code: null,
      source: 'kustom',
      deviceId,
    })
    session.flash('success', `Bahan "${payload.name}" ditambahkan.`)
    return response.redirect().toRoute('ingredients.index')
  }

  /** Hanya bahan kustom dari perangkat yang sama; data tabel komposisi tidak bisa dihapus. */
  async destroy({ params, response, session, deviceId }: HttpContext) {
    const ingredient = await Ingredient.findOrFail(params.id)
    if (ingredient.source !== 'kustom' || ingredient.deviceId !== deviceId) {
      session.flash('error', 'Hanya bahan kustom buatan perangkat ini yang bisa dihapus.')
      return response.redirect().back()
    }
    await ingredient.delete()
    session.flash('success', 'Bahan dihapus.')
    return response.redirect().toRoute('ingredients.index')
  }
}
