import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ingredients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('code', 40).nullable()
      table.string('name', 150).notNullable()
      table.string('category', 60).notNullable()
      /** Nilai per 100 gram berat dapat dimakan (BDD). */
      table.decimal('kalori', 8, 2).notNullable()
      table.decimal('protein', 8, 2).notNullable()
      table.decimal('lemak', 8, 2).notNullable()
      /** Boleh kosong: sebagian bahan di tabel komposisi tidak punya data serat. */
      table.decimal('serat', 8, 2).nullable()
      table.enum('source', ['tkpi', 'kustom']).notNullable()
      table.string('device_id', 64).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
