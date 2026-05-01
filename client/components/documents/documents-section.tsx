"use client"

import { FileText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty } from "@/components/ui/empty"
import { DocumentRow } from "./document-row"
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
