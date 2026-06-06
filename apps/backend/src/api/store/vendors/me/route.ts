import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import VendorModuleService from "../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../modules/vendor"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorId = req.auth_context?.app_metadata?.vendor_id as string

  if (!vendorId) {
    res.status(401).json({ message: "No autenticado como vendedor" })
    return
  }

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  try {
    const vendor = await vendorService.retrieveVendor(vendorId)
    res.json({ vendor })
  } catch {
    res.status(404).json({ message: "Vendedor no encontrado" })
  }
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorId = req.auth_context?.app_metadata?.vendor_id as string

  if (!vendorId) {
    res.status(401).json({ message: "No autenticado como vendedor" })
    return
  }

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  const { company_name, contact_name, contact_phone, description } =
    req.body as Record<string, string>

  const updateData: Record<string, unknown> = {}
  if (company_name) updateData.company_name = company_name
  if (contact_name) updateData.contact_name = contact_name
  if (contact_phone !== undefined) updateData.contact_phone = contact_phone
  if (description !== undefined) updateData.description = description

  const vendor = await vendorService.updateVendors({
    id: vendorId,
    ...updateData,
  })

  res.json({ vendor })
}
