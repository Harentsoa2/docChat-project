"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import { deleteDocument } from "@/lib/api/documents"
import type { DocumentResponse } from "@/lib/types"
import { ApiError } from "@/lib/types"

interface DeleteDocumentDialogProps {
  document: DocumentResponse
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteDocumentDialog({
  document,
  projectId,
  open,
  onOpenChange,
}: DeleteDocumentDialogProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteDocument(document.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
      toast.success("Document supprimé")
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.status === 502) {
          toast.error("Erreur service externe (UploadThing/Pinecone)")
        } else {
          toast.error(typeof error.detail === "string" ? error.detail : "Erreur lors de la suppression")
        }
      } else {
        toast.error("Erreur lors de la suppression du document")
      }
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer le document ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le fichier &quot;{document.filename}&quot; sera supprimé d&apos;UploadThing
            et les vecteurs Pinecone associés seront effacés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              mutation.mutate()
            }}
            disabled={mutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending && <Spinner className="mr-2" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
