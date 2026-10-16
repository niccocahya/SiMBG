import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('weekly_plans', (table) => {
      table.increments('id')
      table.uuid('uuid').notNullable().unique()
      table.string('name', 150).notNullable()
      table.text('notes').nullable()
      table.string('device_id', 64).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('weekly_plan_days', (table) => {
      table.increments('id')
      table.integer('weekly_plan_id').unsigned().notNullable().references('weekly_plans.id').onDelete('CASCADE')
      /** 1 = Senin … 7 = Minggu */
      table.integer('day').notNullable()
      table.integer('evaluation_id').unsigned().notNullable().references('evaluations.id').onDelete('CASCADE')
      table.unique(['weekly_plan_id', 'day'])
    })
  }

  async down() {
    this.schema.dropTable('weekly_plan_days')
    this.schema.dropTable('weekly_plans')
  }
}
