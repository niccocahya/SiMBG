import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'evaluations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.uuid('uuid').notNullable().unique()
      table.string('menu_name', 150).nullable()
      table.string('group_code', 40).notNullable()
      table.string('group_label', 120).notNullable()
      table.enum('sex', ['avg', 'L', 'P']).notNullable().defaultTo('avg')

      /** Nilai yang diisi pengguna (kkal dan gram per porsi). */
      table.decimal('kalori', 10, 3).notNullable()
      table.decimal('protein', 10, 3).notNullable()
      table.decimal('lemak', 10, 3).notNullable()
      table.decimal('serat', 10, 3).notNullable()

      table.double('score_adequacy').notNullable()
      table.double('score').notNullable()
      table.string('category', 40).notNullable()

      /** Target porsi, hasil, dan jejak lengkap (EvaluationResult) dalam JSON. */
      table.text('target').notNullable()
      table.text('result').notNullable()
      /** Salinan parameter yang dipakai, supaya riwayat tetap bisa dijelaskan. */
      table.text('parameter_snapshot').notNullable()
      table.integer('parameter_set_id').unsigned().nullable()
      table.string('parameter_set_name', 120).notNullable()

      /** Daftar bahan bila dihitung dari bahan (F-07). */
      table.text('items').nullable()
      table.enum('source', ['manual', 'bahan', 'simulasi', 'hitung_ulang']).notNullable()
      table.string('device_id', 64).nullable()
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['created_at'])
      table.index(['category'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
