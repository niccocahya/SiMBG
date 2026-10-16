import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'parameter_sets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 120).notNullable()
      table.text('description').nullable()
      /** Seluruh konfigurasi fuzzy (FuzzyConfig) dalam JSON yang sudah divalidasi. */
      table.text('config').notNullable()
      /** Set "Default PRD": tidak bisa diubah atau dihapus. */
      table.boolean('is_locked').notNullable().defaultTo(false)
      table.boolean('is_active').notNullable().defaultTo(false)
      table.string('device_id', 64).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
