"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
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
import { deleteProject } from "@/lib/api/projects"
import type { ProjectResponse } from "@/lib/types"
import { ApiError } from "@/lib/types"

interface DeleteProjectDialogProps {
  project: ProjectResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
}: DeleteProjectDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteProject(project.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      toast.success(
        `Projet supprimé (${data.documents_deleted} documents, ${data.uploadthing_files_deleted} fichiers)`
      )
      onOpenChange(false)
      router.push("/projects")
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.status === 502) {
          toast.error("Erreur service externe (UploadThing/Pinecone)")
        } else {
          toast.error(typeof error.detail === "string" ? error.detail : "Erreur lors de la suppression")
        }
      } else {
        toast.error("Erreur lors de la suppression du projet")
      }
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer le projet ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Tous les documents du projet &quot;{project.name}&quot; seront supprimés,
            ainsi que les fichiers UploadThing et les vecteurs Pinecone associés.
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
