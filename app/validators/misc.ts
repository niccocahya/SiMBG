import vine from '@vinejs/vine'
import { decimal } from './evaluation.js'

export const ingredientValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(150),
  category: vine.string().trim().minLength(2).maxLength(60),
  kalori: decimal().min(0).max(1000),
  protein: decimal().min(0).max(100),
  lemak: decimal().min(0).max(100),
  serat: decimal().min(0).max(100).nullable().optional(),
})

export const weeklyPlanValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(150),
  notes: vine.string().trim().maxLength(1000).nullable().optional(),
})

export const weeklyDayValidator = vine.create({
  evaluationUuid: vine.string().trim().uuid().nullable().optional(),
})

export const parameterMetaValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(120),
  description: vine.string().trim().maxLength(1000).nullable().optional(),
})

export const expertCaseValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(150),
  groupCode: vine.string().trim().maxLength(40),
  sex: vine.enum(['avg', 'L', 'P'] as const),
  kalori: decimal().min(0).max(3000),
  protein: decimal().min(0).max(300),
  lemak: decimal().min(0).max(300),
  serat: decimal().min(0).max(100),
  expertCategory: vine.enum(['tidak_layak', 'perlu_perbaikan', 'layak', 'sangat_layak'] as const),
  expertName: vine.string().trim().maxLength(120).nullable().optional(),
  notes: vine.string().trim().maxLength(500).nullable().optional(),
})
