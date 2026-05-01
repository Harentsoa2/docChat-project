import { apiClient } from "./client"
import type {
  ChatMessageResponse,
  MessageCreate,
  ChatResponse,
} from "@/lib/types"

export async function listProjectMessages(
  projectId: string
): Promise<ChatMessageResponse[]> {
  return apiClient<ChatMessageResponse[]>(`/projects/${projectId}/messages`, {
    method: "GET",
  })
}

export async function chatWithProject(
  projectId: string,
  data: MessageCreate
): Promise<ChatResponse> {
  return apiClient<ChatResponse>(`/projects/${projectId}/chat`, {
    method: "POST",
    body: data,
  })
}
