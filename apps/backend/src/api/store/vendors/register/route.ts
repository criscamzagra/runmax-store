import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import VendorModuleService from "../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../modules/vendor"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  const { company_name, nit, contact_name, contact_email, contact_phone, description } = req.body as {
    company_name: string
    nit: string
    contact_name: string
    contact_email: string
    contact_phone?: string
    description?: string
  }

  if (!company_name || !nit || !contact_name || !contact_email) {
    res.status(400).json({
      message: "Campos requeridos: company_name, nit, contact_name, contact_email",
    })
    return
  }

  const existing = await vendorService.listVendors({ nit })

  if (existing.length > 0) {
    res.status(409).json({
      message: "Ya existe un vendedor registrado con este NIT",
    })
    return
  }

  const vendor = await vendorService.createVendors({
    company_name,
    nit,
    contact_name,
    contact_email,
    contact_phone: contact_phone ?? null,
    description: description ?? null,
    status: "pending",
    fee_pct: 15,
  })

  res.status(201).json({ vendor })
}
