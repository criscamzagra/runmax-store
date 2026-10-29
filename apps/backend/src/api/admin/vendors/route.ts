import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import VendorModuleService from "../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../modules/vendor"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  const status = req.query.status as string | undefined
  // El frontend pregunta "¿este correo ya es vendedor?" con ?email=. Antes se
  // ignoraba y la respuesta traia todos los vendedores.
  const email = req.query.email as string | undefined
  const filters: Record<string, unknown> = {}
  if (status) {
    filters.status = status
  }
  if (email) {
    // Sin distinguir mayusculas: el correo se guarda tal como lo escribieron.
    // Se escapan los comodines de LIKE para que el filtro sea exacto.
    filters.contact_email = { $ilike: email.trim().replace(/[\\%_]/g, "\\$&") }
  }

  const vendors = await vendorService.listVendors(filters)

  res.json({ vendors, count: vendors.length })
}
