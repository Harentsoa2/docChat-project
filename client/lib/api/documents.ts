import { apiClient } from "./client"
import type {
  DocumentResponse,
  DeleteDocumentResponse,
  ProjectDocumentCreate,
} from "@/lib/types"

export async function registerProjectDocument(
  projectId: string,
  data: ProjectDocumentCreate
): Promise<DocumentResponse> {
  return apiClient<DocumentResponse>(`/projects/${projectId}/documents`, {
    method: "POST",
    body: data,
  })
}

export async function listProjectDocuments(
  projectId: string
): Promise<DocumentResponse[]> {
  return apiClient<DocumentResponse[]>(`/projects/${projectId}/documents`, {
    method: "GET",
  })
}

export async function getDocument(documentId: string): Promise<DocumentResponse> {
  return apiClient<DocumentResponse>(`/documents/${documentId}`, {
    method: "GET",
  })
}

export async function deleteDocument(
  documentId: string
): Promise<DeleteDocumentResponse> {
  return apiClient<DeleteDocumentResponse>(`/documents/${documentId}`, {
    method: "DELETE",
  })
}
