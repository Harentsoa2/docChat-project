import { apiClient } from "./client"
import type { MessageCreate, ChatResponse } from "@/lib/types"

export async function chatWithProject(
  projectId: string,
  data: MessageCreate
): Promise<ChatResponse> {
  return apiClient<ChatResponse>(`/projects/${projectId}/chat`, {
    method: "POST",
    body: data,
  })
}
