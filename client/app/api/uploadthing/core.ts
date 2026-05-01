import { createUploadthing, type FileRouter } from "uploadthing/server"

const f = createUploadthing()

export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "16MB", maxFileCount: 10 } })
    .onUploadComplete(async ({ file }) => {
      console.log("Upload complete:", file.key)
      return { fileUrl: file.ufsUrl, fileKey: file.key }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
