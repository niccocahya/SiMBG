import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Saat PARAMETERS_READONLY=true (misalnya di deployment publik untuk
 * demo), semua perubahan parameter ditolak. Halaman tetap bisa dibaca.
 */
export default class ParameterLockMiddleware {
  async handle({ request, response, session }: HttpContext, next: NextFn) {
    if (request.method() !== 'GET' && env.get('PARAMETERS_READONLY', false)) {
      if (request.accepts(['html', 'json']) === 'json') {
        return response.forbidden({ message: 'Parameter sedang dikunci (mode baca-saja).' })
      }
      session.flash('error', 'Parameter sedang dikunci (mode baca-saja) pada deployment ini.')
      return response.redirect().back()
    }
    return next()
  }
}
