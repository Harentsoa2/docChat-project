import { apiClient } from "./client"
import type { ProjectCreate, ProjectResponse, DeleteProjectResponse } from "@/lib/types"

export async function createProject(data: ProjectCreate): Promise<ProjectResponse> {
  return apiClient<ProjectResponse>("/projects", {
    method: "POST",
    body: data,
  })
}

export async function listProjects(): Promise<ProjectResponse[]> {
  return apiClient<ProjectResponse[]>("/projects", {
    method: "GET",
  })
}

export async function deleteProject(projectId: string): Promise<DeleteProjectResponse> {
  return apiClient<DeleteProjectResponse>(`/projects/${projectId}`, {
    method: "DELETE",
  })
}
