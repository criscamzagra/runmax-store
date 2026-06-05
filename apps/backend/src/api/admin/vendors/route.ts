import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import VendorModuleService from "../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../modules/vendor"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  const status = req.query.status as string | undefined
  const filters: Record<string, unknown> = {}
  if (status) {
    filters.status = status
  }

  const vendors = await vendorService.listVendors(filters)

  res.json({ vendors, count: vendors.length })
}
