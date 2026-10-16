/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| Satu peran (pengguna) dan tanpa login. Endpoint yang menulis ke basis
| data dibatasi dengan rate limit; perubahan parameter bisa dikunci
| lewat PARAMETERS_READONLY.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { throttleWrites } from '#start/limiter'

const EvaluationsController = () => import('#controllers/evaluations_controller')
const HistoryController = () => import('#controllers/history_controller')
const IngredientsController = () => import('#controllers/ingredients_controller')
const WeeklyPlansController = () => import('#controllers/weekly_plans_controller')
const ParametersController = () => import('#controllers/parameters_controller')
const ExpertTestsController = () => import('#controllers/expert_tests_controller')
const PagesController = () => import('#controllers/pages_controller')

const UUID = /^[0-9a-f-]{36}$/

/* Evaluasi (F-01 … F-06, F-12, F-13) */
router.get('/', [EvaluationsController, 'create']).as('home')
router.post('/evaluasi', [EvaluationsController, 'store']).as('evaluations.store').use(throttleWrites)
router
  .group(() => {
    router.get('/', [EvaluationsController, 'show']).as('evaluations.show')
    router.get('/cetak', [EvaluationsController, 'print']).as('evaluations.print')
    router.get('/csv', [EvaluationsController, 'csv']).as('evaluations.csv')
    router.post('/hitung-ulang', [EvaluationsController, 'recompute']).as('evaluations.recompute').use(throttleWrites)
    router.delete('/', [EvaluationsController, 'destroy']).as('evaluations.destroy')
  })
  .prefix('/evaluasi/:uuid')
  .where('uuid', UUID)

router.post('/api/evaluasi', [EvaluationsController, 'compute']).as('api.evaluations.compute')

/* Riwayat dan perbandingan (F-08, F-11, F-12) */
router.get('/riwayat', [HistoryController, 'index']).as('history.index')
router.get('/riwayat/csv', [HistoryController, 'csv']).as('history.csv')
router.get('/bandingkan', [HistoryController, 'compare']).as('history.compare')

/* Bahan pangan (F-07) */
router.get('/bahan', [IngredientsController, 'index']).as('ingredients.index')
router.post('/bahan', [IngredientsController, 'store']).as('ingredients.store').use(throttleWrites)
router.delete('/bahan/:id', [IngredientsController, 'destroy']).as('ingredients.destroy').where('id', router.matchers.number())

/* Menu mingguan (F-11) */
router.get('/mingguan', [WeeklyPlansController, 'index']).as('weekly.index')
router.post('/mingguan', [WeeklyPlansController, 'store']).as('weekly.store').use(throttleWrites)
router
  .group(() => {
    router.get('/', [WeeklyPlansController, 'show']).as('weekly.show')
    router.put('/hari/:day', [WeeklyPlansController, 'setDay']).as('weekly.setDay')
    router.delete('/', [WeeklyPlansController, 'destroy']).as('weekly.destroy')
  })
  .prefix('/mingguan/:uuid')
  .where('uuid', UUID)

/* Parameter (F-09, F-10) */
router
  .group(() => {
    router.get('/', [ParametersController, 'index']).as('parameters.index')
    router.post('/', [ParametersController, 'store']).as('parameters.store')
    router.post('/reset', [ParametersController, 'reset']).as('parameters.reset')
    router.post('/impor', [ParametersController, 'import']).as('parameters.import')
    router
      .group(() => {
        router.get('/', [ParametersController, 'show']).as('parameters.show')
        router.put('/', [ParametersController, 'update']).as('parameters.update')
        router.delete('/', [ParametersController, 'destroy']).as('parameters.destroy')
        router.post('/aktifkan', [ParametersController, 'activate']).as('parameters.activate')
        router.get('/ekspor', [ParametersController, 'export']).as('parameters.export')
      })
      .prefix('/:id')
      .where('id', router.matchers.number())
  })
  .prefix('/parameter')
  .use([middleware.parameterLock(), throttleWrites])

/* Uji kesesuaian pakar (F-14) */
router
  .group(() => {
    router.get('/', [ExpertTestsController, 'index']).as('expert.index')
    router.post('/', [ExpertTestsController, 'store']).as('expert.store')
    router.post('/impor', [ExpertTestsController, 'import']).as('expert.import')
    router.get('/templat', [ExpertTestsController, 'template']).as('expert.template')
    router.get('/ekspor', [ExpertTestsController, 'export']).as('expert.export')
    router.delete('/semua', [ExpertTestsController, 'clear']).as('expert.clear')
    router.delete('/:id', [ExpertTestsController, 'destroy']).as('expert.destroy').where('id', router.matchers.number())
  })
  .prefix('/uji-pakar')
  .use(throttleWrites)

/* Tentang metode (F-15) */
router.get('/tentang', [PagesController, 'about']).as('about')
