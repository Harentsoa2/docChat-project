import { ApiError, ValidationErrorResponse } from "@/lib/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, ...rest } = options

  const config: RequestInit = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  if (!response.ok) {
    let detail: string | ValidationErrorResponse["detail"]

    try {
      const errorData = await response.json()
      detail = errorData.detail
    } catch {
      detail = getErrorMessage(response.status)
    }

    throw new ApiError(response.status, detail)
  }

  return response.json()
}

function getErrorMessage(status: number): string {
  switch (status) {
    case 404:
      return "Ressource introuvable"
    case 409:
      return "Ce fichier existe déjà"
    case 422:
      return "Erreur de validation"
    case 502:
      return "Erreur service externe (UploadThing/Pinecone)"
    default:
      return `Erreur serveur (${status})`
  }
}
