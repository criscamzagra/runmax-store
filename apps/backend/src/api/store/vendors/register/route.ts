import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IAuthModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import VendorModuleService from "../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../modules/vendor"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH)

  const {
    company_name,
    nit,
    contact_name,
    contact_email,
    contact_phone,
    pickup_address,
    pickup_city,
    description,
    password,
  } = req.body as {
    company_name: string
    nit: string
    contact_name: string
    contact_email: string
    contact_phone?: string
    pickup_address?: string
    pickup_city?: string
    description?: string
    password: string
  }

  if (!company_name || !nit || !contact_name || !contact_email || !password) {
    res.status(400).json({
      message:
        "Campos requeridos: company_name, nit, contact_name, contact_email, password",
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

  const existingByEmail = await vendorService.listVendors({
    contact_email,
  })
  if (existingByEmail.length > 0) {
    res.status(409).json({
      message: "Ya existe un vendedor registrado con este email",
    })
    return
  }

  let authIdentityId: string
  try {
    const result = await authModuleService.register("emailpass", {
      body: { email: contact_email, password },
    } as any)

    if (!result.success || !result.authIdentity) {
      res.status(400).json({
        message: result.error ?? "Error al crear credenciales",
      })
      return
    }

    authIdentityId = result.authIdentity.id
  } catch (e: any) {
    if (e.message?.includes("already exists") || e.message?.includes("Identity")) {
      res.status(409).json({
        message: "Ya existe una cuenta con este email",
      })
      return
    }
    throw e
  }

  const vendor = await vendorService.createVendors({
    company_name,
    nit,
    contact_name,
    contact_email,
    contact_phone: contact_phone ?? null,
    pickup_address: pickup_address ?? null,
    pickup_city: pickup_city ?? null,
    description: description ?? null,
    status: "pending",
    fee_pct: 15,
  })

  await authModuleService.updateAuthIdentities([
    {
      id: authIdentityId,
      app_metadata: {
        vendor_id: vendor.id,
      },
    },
  ])

  res.status(201).json({ vendor })
}
