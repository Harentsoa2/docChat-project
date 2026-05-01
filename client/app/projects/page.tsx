"use client"

import { useQuery } from "@tanstack/react-query"
import { listProjects } from "@/lib/api/projects"
import { ProjectCard } from "@/components/projects/project-card"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty } from "@/components/ui/empty"
import { Plus, FolderOpen } from "lucide-react"
import { useState } from "react"

export default function ProjectsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  })

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Projets</h1>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau projet
        </Button>
      </header>

      <main className="flex-1 p-4 lg:p-6">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <Empty
            icon={FolderOpen}
            title="Aucun projet"
            description="Créez votre premier projet pour commencer à gérer vos documents."
          >
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un projet
            </Button>
          </Empty>
        )}
      </main>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  )
}
