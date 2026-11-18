import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import VendorModuleService from "../modules/vendor/service"
import { VENDOR_MODULE } from "../modules/vendor"

/**
 * Solo un vendedor aprobado puede crear, editar o borrar productos y subir
 * imagenes. Antes esto lo frenaba solo el panel /vendedor del frontend: un
 * vendedor pendiente o rechazado podia llamar a la API directamente y crear
 * productos en borrador. Pedidos y estadisticas ya lo comprobaban en su ruta.
 *
 * Va despues de `authenticate("vendor", ...)` en middlewares.ts, que es quien
 * llena `auth_context`.
 */
export async function requireApprovedVendor(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> {
  const vendorId = req.auth_context?.app_metadata?.vendor_id as string | undefined

  if (!vendorId) {
    res.status(401).json({ message: "No autenticado como vendedor" })
    return
  }

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  let status: string | undefined
  try {
    status = (await vendorService.retrieveVendor(vendorId)).status
  } catch {
    res.status(401).json({ message: "No autenticado como vendedor" })
    return
  }

  if (status !== "approved") {
    res.status(403).json({ message: "Vendedor no aprobado" })
    return
  }

  next()
}
