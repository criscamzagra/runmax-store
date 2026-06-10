import { defineMiddlewares, authenticate } from "@medusajs/medusa"
import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/vendors/me*",
      middlewares: [authenticate("vendor", ["bearer", "session"])],
    },
    {
      method: ["POST"],
      matcher: "/store/vendors/me/uploads",
      middlewares: [upload.array("files")],
    },
  ],
})
