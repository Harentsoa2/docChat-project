"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  isUploading: boolean
}

export function UploadDropzone({
  onFilesSelected,
  isUploading,
}: UploadDropzoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    disabled: isUploading,
  })

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles)
      setSelectedFiles([])
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          isUploading && "pointer-events-none opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mb-2 h-10 w-10 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm text-muted-foreground">Déposez les fichiers ici...</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Glissez-déposez des PDFs ou cliquez pour sélectionner
          </p>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Fichiers sélectionnés :</p>
          <div className="max-h-[150px] space-y-1 overflow-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 rounded-md bg-muted px-3 py-2"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  disabled={isUploading}
                  aria-label={`Retirer ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Spinner className="mr-2" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importer {selectedFiles.length} fichier(s)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
