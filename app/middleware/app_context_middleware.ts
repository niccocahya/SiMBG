import { randomUUID } from 'node:crypto'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const COOKIE = 'simbg_device'

/** Evaluasi terbaru dan parameter aktif untuk sidebar serta ticker di bagian atas. */
async function loadWidgets() {
  const [{ default: Evaluation }, { default: ParameterService }] = await Promise.all([
    import('#models/evaluation'),
    import('#services/parameter_service'),
  ])
  const [latest, active] = await Promise.all([
    Evaluation.query().withScopes((s) => s.visible()).orderBy('created_at', 'desc').orderBy('id', 'desc').limit(5),
    ParameterService.active(),
  ])
  return { latest, active }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    /** UUID acak per browser. Bukan identitas orang; hanya untuk hak hapus riwayat. */
    deviceId: string
  }
}

/**
 * Pengganti login: setiap browser mendapat ID perangkat anonim di cookie
 * bertanda tangan. Riwayat bisa dilihat semua orang, tetapi hanya bisa
 * dihapus dari perangkat yang membuatnya.
 */
export default class AppContextMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    let deviceId = ctx.request.cookie(COOKIE)
    if (typeof deviceId !== 'string' || !/^[0-9a-f-]{36}$/.test(deviceId)) {
      deviceId = randomUUID()
      ctx.response.cookie(COOKIE, deviceId, { maxAge: '1y', httpOnly: true, sameSite: 'lax' })
    }
    ctx.deviceId = deviceId

    ctx.view.share({
      deviceId,
      parametersReadonly: env.get('PARAMETERS_READONLY', false),
      // Data untuk sidebar dan ticker; dimuat hanya saat sebuah view dirender
      siteWidgets: () => loadWidgets(),
    })

    return next()
  }
}
