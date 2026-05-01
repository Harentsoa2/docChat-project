"use client"

import { useQuery } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { FileText, FolderOpen, Plus } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { listProjects } from "@/lib/api/projects"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { useState } from "react"

export function AppSidebar() {
  const pathname = usePathname()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  })

  return (
    <>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <Link href="/projects" className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">DocRAG</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <div className="flex items-center justify-between px-2">
              <SidebarGroupLabel>Projets</SidebarGroupLabel>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCreateDialogOpen(true)}
                aria-label="Nouveau projet"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoading ? (
                  <>
                    <SidebarMenuSkeleton />
                    <SidebarMenuSkeleton />
                    <SidebarMenuSkeleton />
                  </>
                ) : projects && projects.length > 0 ? (
                  projects.map((project) => (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/projects/${project.id}`}
                      >
                        <Link href={`/projects/${project.id}`}>
                          <FolderOpen className="h-4 w-4" />
                          <span className="truncate">{project.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Aucun projet
                  </div>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  )
}
