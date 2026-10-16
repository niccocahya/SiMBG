/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| Konfigurasi global VineJS: tanggal dikonversi ke Luxon DateTime, dan
| semua pesan galat memakai Bahasa Indonesia.
|
*/

import { DateTime } from 'luxon'
import vine, { SimpleMessagesProvider, VineDate } from '@vinejs/vine'

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))

vine.messagesProvider = new SimpleMessagesProvider(
  {
    'required': '{{ field }} wajib diisi.',
    'string': '{{ field }} harus berupa teks.',
    'number': '{{ field }} harus berupa angka.',
    'min': '{{ field }} minimal {{ min }}.',
    'max': '{{ field }} maksimal {{ max }}.',
    'range': '{{ field }} harus di antara {{ min }} dan {{ max }}.',
    'minLength': '{{ field }} minimal {{ min }} karakter.',
    'maxLength': '{{ field }} maksimal {{ max }} karakter.',
    'enum': 'Pilihan {{ field }} tidak valid.',
    'in': 'Pilihan {{ field }} tidak valid.',
    'array': '{{ field }} harus berupa daftar.',
    'array.minLength': '{{ field }} minimal berisi {{ min }} item.',
    'array.maxLength': '{{ field }} maksimal berisi {{ max }} item.',
    'object': '{{ field }} tidak valid.',
    'uuid': '{{ field }} tidak valid.',
    'boolean': 'Nilai tidak valid.',
  },
  {
    menuName: 'Nama menu',
    groupCode: 'Kelompok sasaran',
    sex: 'Jenis kelamin',
    kalori: 'Kalori',
    protein: 'Protein',
    lemak: 'Lemak',
    serat: 'Serat',
    items: 'Daftar bahan',
    grams: 'Berat bahan',
    ingredientId: 'Bahan',
    name: 'Nama',
    category: 'Kategori',
    expertCategory: 'Kategori pakar',
    ids: 'Evaluasi',
  }
)
