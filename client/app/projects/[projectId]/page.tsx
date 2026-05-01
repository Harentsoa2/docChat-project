"use client"

import { use, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { listProjects } from "@/lib/api/projects"
import { listProjectDocuments } from "@/lib/api/documents"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Trash2, Upload, FileText, MessageSquare } from "lucide-react"
import { DocumentsSection } from "@/components/documents/documents-section"
import { ChatSection } from "@/components/chat/chat-section"
import { UploadDialog } from "@/components/documents/upload-dialog"
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog"
import { useIsMobile } from "@/hooks/use-mobile"

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.projectId
  const isMobile = useIsMobile()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"documents" | "chat">("documents")

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  })

  const { data: documents, isLoading: loadingDocuments } = useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => listProjectDocuments(projectId),
    refetchInterval: (query) => {
      const docs = query.state.data
      if (!docs) return false
      const hasProcessing = docs.some(
        (d) => d.status === "pending" || d.status === "processing"
      )
      return hasProcessing ? 5000 : false
    },
  })

  const project = projects?.find((p) => p.id === projectId)

  if (loadingProjects) {
    return (
      <>
        <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6">
          <SidebarTrigger />
          <Skeleton className="h-6 w-48" />
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Skeleton className="h-[400px]" />
        </main>
      </>
    )
  }

  if (!project) {
    return (
      <>
        <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6">
          <SidebarTrigger />
          <span className="text-lg font-semibold">Projet introuvable</span>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <p className="text-muted-foreground">
            Ce projet n&apos;existe pas ou a été supprimé.
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6">
        <SidebarTrigger />
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-lg font-semibold">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Importer PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
            aria-label="Supprimer le projet"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </header>

      <main className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Sidebar avec onglets verticaux */}
        <div className="flex w-full">
          {/* Colonnes d'onglets latéraux */}
          <div className="flex border-r">
            <div className="flex flex-col gap-1 p-2">
              <Button
                variant={activeTab === "documents" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setActiveTab("documents")}
                className="h-12 w-12"
                title="Documents"
              >
                <FileText className="h-5 w-5" />
              </Button>
              <Button
                variant={activeTab === "chat" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setActiveTab("chat")}
                className="h-12 w-12"
                title="Chat"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="flex-1 overflow-auto p-4 lg:p-6">
            {activeTab === "documents" ? (
              <DocumentsSection
                projectId={projectId}
                documents={documents ?? []}
                isLoading={loadingDocuments}
              />
            ) : (
              <ChatSection projectId={projectId} documents={documents ?? []} />
            )}
          </div>
        </div>
      </main>

      <UploadDialog
        projectId={projectId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
      <DeleteProjectDialog
        project={project}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  )
}
