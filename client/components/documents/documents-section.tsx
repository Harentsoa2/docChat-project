"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileText, Play, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { DocumentRow } from "./document-row"
import { processProjectDocuments } from "@/lib/api/documents"
import { toast } from "sonner"
import type { DocumentResponse } from "@/lib/types"

interface DocumentsSectionProps {
  projectId: string
  documents: DocumentResponse[]
  isLoading: boolean
}

export function DocumentsSection({
  projectId,
  documents,
  isLoading,
}: DocumentsSectionProps) {
  const queryClient = useQueryClient()
  const pendingCount = documents.filter((d) => d.status === "pending").length

  const processMutation = useMutation({
    mutationFn: () => processProjectDocuments(projectId),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
    },
    onError: (error) => {
      toast.error("Erreur lors du traitement des documents")
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Documents</h2>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <h2 className="mb-4 text-lg font-semibold">Documents</h2>
        <Empty
          icon={FileText}
          title="Aucun document"
          description="Importez des fichiers PDF pour les indexer et les interroger via le chat."
          className="flex-1"
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Documents ({documents.length})
        </h2>
        {pendingCount > 0 && (
          <Button
            size="sm"
            onClick={() => processMutation.mutate()}
            disabled={processMutation.isPending}
          >
            {processMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Traiter tout ({pendingCount})
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {documents.map((document) => (
          <DocumentRow
            key={document.id}
            document={document}
            projectId={projectId}
          />
        ))}
      </div>
    </div>
  )
}
