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
      // Medusa ya autentica /store/customers/me*, pero esta ruta cambia la
      // contrasena: mejor declararlo aca que depender de ese matcher.
      method: ["POST"],
      matcher: "/store/customers/me/password",
      middlewares: [authenticate("customer", ["bearer", "session"])],
    },
    {
      method: ["POST"],
      matcher: "/store/vendors/me/uploads",
      middlewares: [upload.array("files")],
    },
  ],
})
