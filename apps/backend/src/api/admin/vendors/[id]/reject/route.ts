import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import VendorModuleService from "../../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../../modules/vendor"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  const { id } = req.params
  const { reason } = req.body as { reason?: string }

  const vendor = await vendorService.updateVendors({
    id,
    status: "rejected",
    metadata: reason ? { rejection_reason: reason } : null,
  })

  res.json({ vendor })
}
