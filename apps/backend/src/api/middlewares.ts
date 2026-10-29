import { defineMiddlewares, authenticate } from "@medusajs/medusa"
import multer from "multer"
import { requireApprovedVendor } from "../utils/require-approved-vendor"
import { requireIdentityEmail, requireRegistrationCode } from "../utils/registration-middlewares"

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
      matcher: "/store/vendors/me/products*",
      middlewares: [requireApprovedVendor],
    },
    {
      // Va antes del multer: a un vendedor no aprobado no se le leen los
      // archivos.
      method: ["POST"],
      matcher: "/store/vendors/me/uploads",
      middlewares: [requireApprovedVendor],
    },
    {
      // Solo clientes: vendedores se registran por /store/vendors/register,
      // con su propia verificacion de correo.
      method: ["POST"],
      matcher: "/auth/customer/emailpass/register",
      middlewares: [requireRegistrationCode],
    },
    {
      method: ["POST"],
      matcher: "/store/customers",
      middlewares: [
        authenticate("customer", ["bearer", "session"], { allowUnregistered: true }),
        requireIdentityEmail,
      ],
    },
    {
      method: ["POST"],
      matcher: "/store/vendors/me/uploads",
      middlewares: [upload.array("files")],
    },
  ],
})
