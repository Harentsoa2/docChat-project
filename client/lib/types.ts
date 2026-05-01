// Project types
export interface ProjectCreate {
  name: string
  description?: string | null
}

export interface ProjectResponse {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface DeleteProjectResponse {
  deleted: boolean
  project_id: string
  documents_deleted: number
  uploadthing_files_deleted: number
  pinecone_deleted: boolean
}

// Document types
export type DocumentStatus = "pending" | "processing" | "ready" | "error"

export interface DocumentCreate {
  project_id: string
  filename: string
  file_url: string
  file_key: string
}

export interface ProjectDocumentCreate {
  filename: string
  file_url: string
  file_key: string
}

export interface DocumentResponse {
  id: string
  project_id: string
  filename: string
  file_url: string
  file_key: string
  status: DocumentStatus
  error_message: string | null
  created_at: string
}

export interface DeleteDocumentResponse {
  deleted: boolean
  document_id: string
  project_id: string
  uploadthing_deleted: boolean
  pinecone_deleted: boolean
}

// Chat types
export interface MessageCreate {
  content: string
}

export interface SourceItem {
  document: string
  page: number
  content: string
}

export interface ChatResponse {
  answer: string
  sources: SourceItem[]
}

// Error types
export interface ErrorResponse {
  detail: string
}

export interface ValidationErrorItem {
  loc: (string | number)[]
  msg: string
  type: string
}

export interface ValidationErrorResponse {
  detail: ValidationErrorItem[]
}

// API Error class
export class ApiError extends Error {
  status: number
  detail: string | ValidationErrorItem[]

  constructor(status: number, detail: string | ValidationErrorItem[]) {
    super(typeof detail === "string" ? detail : "Validation error")
    this.status = status
    this.detail = detail
  }
}
