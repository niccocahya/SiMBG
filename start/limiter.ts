/*
|--------------------------------------------------------------------------
| Rate limit
|--------------------------------------------------------------------------
|
| Tanpa login, siapa pun bisa mengirim data. Batas ini mencegah spam
| pada endpoint yang menulis ke basis data.
|
*/

import app from '@adonisjs/core/services/app'
import limiter from '@adonisjs/limiter/services/main'

export const throttleWrites = limiter.define('writes', (ctx) => {
  if (app.inTest || ctx.request.method() === 'GET') return limiter.noLimit()
  return limiter
    .allowRequests(30)
    .every('1 minute')
    .usingKey(`ip_${ctx.request.ip()}`)
    .limitExceeded((error) => {
      error.setMessage('Terlalu banyak permintaan. Coba lagi dalam satu menit.')
    })
})
