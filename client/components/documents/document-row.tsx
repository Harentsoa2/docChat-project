"use client"

import { useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { FileText, Trash2, ExternalLink, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DeleteDocumentDialog } from "./delete-document-dialog"
import type { DocumentResponse, DocumentStatus } from "@/lib/types"

interface DocumentRowProps {
  document: DocumentResponse
  projectId: string
}

const statusConfig: Record<
  DocumentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "En attente", variant: "secondary" },
  processing: { label: "Traitement...", variant: "default" },
  ready: { label: "Prêt", variant: "outline" },
  error: { label: "Erreur", variant: "destructive" },
}

export function DocumentRow({ document, projectId }: DocumentRowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const status = statusConfig[document.status]

  return (
    <>
      <Card className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {document.status === "processing" ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-sm">{document.filename}</p>
            <Badge variant={status.variant} className="shrink-0">
              {status.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(document.created_at), "d MMM yyyy à HH:mm", {
              locale: fr,
            })}
          </p>
          {document.status === "error" && document.error_message && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    Erreur de traitement
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{document.error_message}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label="Ouvrir le fichier"
          >
            <a href={document.file_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
            aria-label="Supprimer le document"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </Card>
      <DeleteDocumentDialog
        document={document}
        projectId={projectId}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  )
}
