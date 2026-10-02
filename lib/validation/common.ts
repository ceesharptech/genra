import { z } from 'zod'

/**
 * Common string schemas used across Genra forms and server actions.
 */

export const uuidSchema = z.string().uuid()

export const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(100, 'Slug cannot exceed 100 characters')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must be lowercase alphanumeric with single hyphens'
  )

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username cannot exceed 30 characters')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username can only contain letters, numbers, and underscores'
  )

export const titleSchema = z
  .string()
  .trim()
  .min(2, 'Title must be at least 2 characters')
  .max(140, 'Title cannot exceed 140 characters')

export const descriptionSchema = z
  .string()
  .trim()
  .max(5000, 'Description cannot exceed 5000 characters')
  .optional()

export const urlSchema = z
  .string()
  .url('Must be a valid URL')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'URL must start with http:// or https://'
  )
