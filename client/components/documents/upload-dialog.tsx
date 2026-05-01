"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { generateReactHelpers } from "@uploadthing/react"
import type { OurFileRouter } from "@/app/api/uploadthing/core"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { registerProjectDocument } from "@/lib/api/documents"
import { ApiError } from "@/lib/types"
import { UploadDropzone } from "./upload-dropzone"

const { useUploadThing } = generateReactHelpers<OurFileRouter>()

interface UploadDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UploadDialog({
  projectId,
  open,
  onOpenChange,
}: UploadDialogProps) {
  const queryClient = useQueryClient()

  const registerMutation = useMutation({
    mutationFn: (data: { filename: string; file_url: string; file_key: string }) =>
      registerProjectDocument(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          toast.error("Ce fichier existe déjà")
        } else {
          toast.error(typeof error.detail === "string" ? error.detail : "Erreur lors de l'enregistrement")
        }
      } else {
        toast.error("Erreur lors de l'enregistrement du document")
      }
    },
  })

  const { startUpload, isUploading } = useUploadThing("pdfUploader", {
    onClientUploadComplete: async (res) => {
      for (const file of res) {
        await registerMutation.mutateAsync({
          filename: file.name,
          file_url: file.ufsUrl,
          file_key: file.key,
        })
      }
      toast.success(`${res.length} fichier(s) importé(s)`)
      onOpenChange(false)
    },
    onUploadError: (error) => {
      toast.error(error.message || "Erreur lors de l'upload")
    },
  })

  const handleFilesSelected = async (files: File[]) => {
    if (files.length > 0) {
      await startUpload(files)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer des documents PDF</DialogTitle>
          <DialogDescription>
            Glissez-déposez vos fichiers PDF ou cliquez pour sélectionner.
            Les documents seront automatiquement indexés.
          </DialogDescription>
        </DialogHeader>
        <UploadDropzone
          onFilesSelected={handleFilesSelected}
          isUploading={isUploading || registerMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
