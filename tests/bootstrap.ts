import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { browserClient } from '@japa/browser-client'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { dbAssertions } from '@adonisjs/lucid/plugins/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { shieldApiClient } from '@adonisjs/shield/plugins/api_client'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import { sessionBrowserClient } from '@adonisjs/session/plugins/browser_client'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  assert(),
  apiClient(),
  pluginAdonisJS(app),
  dbAssertions(app),
  sessionApiClient(app),
  shieldApiClient(),
  browserClient({ runInSuites: ['browser'] }),
  sessionBrowserClient(app),
]

/**
 * Basis data uji (tmp/test.sqlite3, lihat .env.test) dimigrasi ulang dan
 * diisi data acuan sebelum test berjalan.
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [
    async () => {
      // Fungsi rollback dikembalikan agar basis data uji bersih lagi setelah test selesai
      const rollback = await testUtils.db().migrate()
      await testUtils.db().seed()
      return rollback
    },
  ],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
