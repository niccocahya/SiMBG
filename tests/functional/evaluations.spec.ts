import { test } from '@japa/runner'
import env from '#start/env'
import Evaluation from '#models/evaluation'
import ParameterSet from '#models/parameter_set'

const countOf = async (model: typeof Evaluation | typeof ParameterSet) =>
  Number((await model.query().count('* as total'))[0].$extras.total)

/** Kasus PRD untuk SD 7–9 tahun (target 495 kkal, 12 g, 16,5 g, 6,9 g). */
const PRD_CASE = {
  menuName: 'Contoh PRD',
  groupCode: 'sd_7_9',
  sex: 'avg',
  kalori: '470,25',
  protein: '9.6',
  lemak: '19.8',
  serat: '3.795',
}

test.group('Evaluasi | form dan hasil', () => {
  test('halaman form tampil dengan target porsi', async ({ client }) => {
    const response = await client.get('/')
    response.assertStatus(200)
    response.assertTextIncludes('Evaluasi kelayakan gizi menu')
  })

  test('kasus PRD tersimpan dengan skor 55 dan halaman hasil memuat disclaimer', async ({ client, assert }) => {
    const response = await client.post('/evaluasi').withCsrfToken().form(PRD_CASE).redirects(0)
    response.assertStatus(302)

    const evaluation = await Evaluation.query().orderBy('id', 'desc').firstOrFail()
    assert.closeTo(evaluation.score, 55, 0.01)
    assert.equal(evaluation.category, 'perlu_perbaikan')
    assert.equal(evaluation.parameterSetName, 'Default PRD')
    assert.lengthOf(evaluation.parameterSnapshot.stage2Rules, 27)

    const page = await client.get(`/evaluasi/${evaluation.uuid}`)
    page.assertStatus(200)
    page.assertTextIncludes('bukan penilaian atau sertifikasi resmi')
    page.assertTextIncludes('lemak berlebih')
    page.assertTextIncludes('serat masih di bawah target')
  })

  test('input tidak valid ditolak dengan pesan Bahasa Indonesia', async ({ client, assert }) => {
    const before = await countOf(Evaluation)
    const response = await client
      .post('/api/evaluasi')
      .header('Accept', 'application/json')
      .json({ groupCode: 'sd_7_9', sex: 'avg', kalori: '', protein: 'abc', lemak: 5, serat: 500 })
    response.assertStatus(422)
    const messages = response.body().errors.map((e: { message: string }) => e.message)
    assert.include(messages, 'Kalori wajib diisi.')
    assert.include(messages, 'Protein harus berupa angka.')
    assert.include(messages, 'Serat maksimal 100.')
    const after = await countOf(Evaluation)
    assert.equal(after, before)
  })

  test('API menghitung tanpa menyimpan', async ({ client, assert }) => {
    const response = await client.post('/api/evaluasi').json(PRD_CASE)
    response.assertStatus(200)
    assert.closeTo(response.body().result.score, 55, 0.01)
  })

  test('hitung dari bahan memakai total dari server, bukan dari browser', async ({ client, assert }) => {
    const response = await client
      .post('/evaluasi')
      .withCsrfToken()
      .form({
        menuName: 'Dari bahan',
        groupCode: 'sd_7_9',
        sex: 'avg',
        mode: 'bahan',
        kalori: '99999',
        'items[0][ingredientId]': '1',
        'items[0][grams]': '100',
      })
      .redirects(0)
    response.assertStatus(302)
    const evaluation = await Evaluation.query().orderBy('id', 'desc').firstOrFail()
    assert.equal(evaluation.source, 'bahan')
    assert.closeTo(evaluation.kalori, 180, 0.01) // nasi putih 100 g
    assert.lengthOf(evaluation.items!, 1)
  })

  test('riwayat dan CSV memuat evaluasi', async ({ client }) => {
    const page = await client.get('/riwayat')
    page.assertStatus(200)
    page.assertTextIncludes('Contoh PRD')

    const csv = await client.get('/riwayat/csv')
    csv.assertStatus(200)
    csv.assertHeader('content-type', 'text/csv; charset=utf-8')
  })

  test('evaluasi hanya bisa dihapus dari perangkat pembuatnya', async ({ client, assert }) => {
    const evaluation = await Evaluation.query().orderBy('id', 'desc').firstOrFail()
    evaluation.deviceId = 'perangkat-lain'
    await evaluation.save()

    await client.delete(`/evaluasi/${evaluation.uuid}`).withCsrfToken().redirects(0)
    await evaluation.refresh()
    assert.isNull(evaluation.deletedAt)
  })
})

test.group('Parameter | default terkunci dan mode baca-saja', () => {
  test('set default tidak bisa diubah', async ({ client, assert }) => {
    const locked = await ParameterSet.query().where('is_locked', true).firstOrFail()
    await client
      .put(`/parameter/${locked.id}`)
      .withCsrfToken()
      .form({ 'name': 'Diubah', 'config[portionPercent]': '10' })
      .redirects(0)
    await locked.refresh()
    assert.equal(locked.name, 'Default PRD')
    assert.equal(locked.config.portionPercent, 30)
  })

  test('parameter dengan celah himpunan ditolak (422)', async ({ client }) => {
    const locked = await ParameterSet.query().where('is_locked', true).firstOrFail()
    const copy = await ParameterSet.create({ ...locked.serialize(), id: undefined, name: 'Salinan uji', isLocked: false, isActive: false, config: locked.config } as any)

    const config: any = structuredClone(locked.config)
    config.variables.serat.sets[0].params = [0, 0, 40, 60]
    config.variables.serat.sets[1].params = [75, 78, 80, 100]
    const response = await client.put(`/parameter/${copy.id}`).withCsrfToken().json({ name: 'Salinan uji', config })
    response.assertStatus(422)
    response.assertTextIncludes('celah')
  })

  test('PARAMETERS_READONLY=true menolak perubahan', async ({ client, assert }) => {
    env.set('PARAMETERS_READONLY', true)
    try {
      const before = await countOf(ParameterSet)
      const response = await client.post('/parameter').withCsrfToken().header('Accept', 'application/json').json({})
      response.assertStatus(403)
      const after = await countOf(ParameterSet)
      assert.equal(after, before)
    } finally {
      env.set('PARAMETERS_READONLY', false)
    }
  })
})

test.group('Halaman lain', () => {
  for (const path of ['/bahan', '/mingguan', '/parameter', '/uji-pakar', '/tentang']) {
    test(`GET ${path} → 200`, async ({ client }) => {
      const response = await client.get(path)
      response.assertStatus(200)
    })
  }
})
