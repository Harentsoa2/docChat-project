import { createRouteHandler } from "uploadthing/server"
import { ourFileRouter } from "./core"

export const GET = createRouteHandler({
  router: ourFileRouter,
  config: {
    callbackUrl: process.env.UPLOADTHING_URL,
  },
})

export const POST = createRouteHandler({
  router: ourFileRouter,
  config: {
    callbackUrl: process.env.UPLOADTHING_URL,
  },
})
