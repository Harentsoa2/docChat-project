"use client"

import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { FolderOpen, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProjectResponse } from "@/lib/types"

interface ProjectCardProps {
  project: ProjectResponse
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group transition-colors hover:border-primary/50">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate text-base">{project.name}</CardTitle>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </CardHeader>
        <CardContent className="pt-0">
          {project.description && (
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Créé le {format(new Date(project.created_at), "d MMMM yyyy", { locale: fr })}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
