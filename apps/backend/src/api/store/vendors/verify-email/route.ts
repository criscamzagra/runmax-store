import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import VendorModuleService from "../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../modules/vendor"

/**
 * POST /store/vendors/verify-email
 * Body: { token: string }
 *
 * Marca el email del vendedor como verificado si el token es valido
 * y no ha expirado. El token es de un solo uso: se limpia al verificar.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  const { token } = req.body as { token?: string }

  if (!token) {
    res.status(400).json({ message: "Token requerido" })
    return
  }

  const vendors = await vendorService.listVendors({
    email_verification_token: token,
  })

  if (vendors.length === 0) {
    res.status(404).json({
      message: "El enlace de verificacion no es valido o ya fue usado",
    })
    return
  }

  const vendor = vendors[0]

  if (
    vendor.email_verification_expires_at &&
    new Date(vendor.email_verification_expires_at) < new Date()
  ) {
    res.status(410).json({
      message: "El enlace de verificacion expiro. Contacta a soporte para reenviarlo.",
    })
    return
  }

  await vendorService.updateVendors({
    id: vendor.id,
    email_verified: true,
    email_verification_token: null,
    email_verification_expires_at: null,
  })

  res.status(200).json({
    success: true,
    company_name: vendor.company_name,
  })
}
