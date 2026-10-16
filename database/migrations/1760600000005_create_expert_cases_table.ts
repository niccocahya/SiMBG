import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'expert_cases'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 150).notNullable()
      table.string('group_code', 40).notNullable()
      table.enum('sex', ['avg', 'L', 'P']).notNullable().defaultTo('avg')
      table.decimal('kalori', 10, 3).notNullable()
      table.decimal('protein', 10, 3).notNullable()
      table.decimal('lemak', 10, 3).notNullable()
      table.decimal('serat', 10, 3).notNullable()
      /** Kategori menurut penilaian pakar. */
      table.string('expert_category', 40).notNullable()
      table.string('expert_name', 120).nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
