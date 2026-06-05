import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import VendorModuleService from "../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../modules/vendor"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  const { id } = req.params

  const vendor = await vendorService.retrieveVendor(id)
  res.json({ vendor })
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  const { id } = req.params
  const data = req.body as Record<string, unknown>

  const vendor = await vendorService.updateVendors({ id, ...data })
  res.json({ vendor })
}
