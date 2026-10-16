import { column } from '@adonisjs/lucid/orm'

/** Kolom teks berisi JSON. */
export const jsonColumn = (options: { serializeAs?: string | null } = {}) =>
  column({
    ...options,
    prepare: (value: unknown) => (value === null || value === undefined ? null : JSON.stringify(value)),
    consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
  })

/** Kolom desimal; PostgreSQL mengembalikan string, SQLite mengembalikan angka. */
export const numberColumn = () =>
  column({ consume: (value: unknown) => (value === null || value === undefined ? value : Number(value)) })

/** Kolom boolean; SQLite menyimpan 0/1. */
export const booleanColumn = () => column({ consume: (value: unknown) => Boolean(value) })
