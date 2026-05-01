import { z } from "zod"

export const projectCreateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(255, "Le nom est trop long"),
  description: z.string().max(1000, "La description est trop longue").nullable().optional(),
})

export const documentCreateSchema = z.object({
  project_id: z.string().uuid("ID de projet invalide"),
  filename: z.string().min(1, "Le nom du fichier est requis").regex(/\.pdf$/i, "Le fichier doit être un PDF"),
  file_url: z.string().url("URL invalide"),
  file_key: z.string().min(1, "file_key est requis"),
})

export const projectDocumentCreateSchema = z.object({
  filename: z.string().min(1, "Le nom du fichier est requis").regex(/\.pdf$/i, "Le fichier doit être un PDF"),
  file_url: z.string().url("URL invalide"),
  file_key: z.string().min(1, "file_key est requis"),
})

export const messageCreateSchema = z.object({
  content: z.string().min(1, "Le message ne peut pas être vide"),
})

export const uuidSchema = z.string().uuid("UUID invalide")

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>
export type DocumentCreateInput = z.infer<typeof documentCreateSchema>
export type ProjectDocumentCreateInput = z.infer<typeof projectDocumentCreateSchema>
export type MessageCreateInput = z.infer<typeof messageCreateSchema>
