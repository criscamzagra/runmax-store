import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import VendorModuleService from "../../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../../modules/vendor"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  const { id } = req.params
  const { fee_pct } = req.body as { fee_pct?: number }

  const updateData: Record<string, unknown> = { status: "approved" }
  if (fee_pct !== undefined) {
    updateData.fee_pct = fee_pct
  }

  const vendor = await vendorService.updateVendors({ id, ...updateData })
  res.json({ vendor })
}
