import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import VendorModuleService from "../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../modules/vendor"
import { notifyAdminNewVendor } from "../../../../utils/admin-signup-email"
import {
  applicationMetadata,
  parseVendorApplication,
} from "../../../../utils/vendor-application"

/**
 * Solicitud para vender en Runmax, sin contraseña. Crea el vendedor en estado
 * `pending` y avisa al equipo; la cuenta para entrar al panel se crea al
 * aprobarlo. Ver utils/vendor-application.ts.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = parseVendorApplication(req.body)
  if (!parsed.ok) {
    res.status(400).json({ message: parsed.message })
    return
  }
  const a = parsed.application

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  if ((await vendorService.listVendors({ nit: a.tax_id })).length > 0) {
    res.status(409).json({ message: "Ya existe una tienda registrada con este NIT o documento" })
    return
  }
  if ((await vendorService.listVendors({ contact_email: a.email })).length > 0) {
    res.status(409).json({ message: "Ya existe una tienda registrada con este correo" })
    return
  }

  const vendor = await vendorService.createVendors({
    company_name: a.legal_name,
    nit: a.tax_id,
    contact_name: a.contact_name,
    contact_email: a.email,
    contact_phone: a.phone,
    pickup_city: a.city,
    description: a.message,
    status: "pending",
    fee_pct: 15,
    email_verified: false,
    metadata: {
      application: {
        ...applicationMetadata(a),
        user_agent: (req.headers["user-agent"] ?? "").slice(0, 300) || null,
        referrer: (req.headers["referer"] ?? "").slice(0, 300) || null,
      },
    },
  })

  await notifyAdminNewVendor(vendor, a)

  // Solo lo que la persona puede ver de su propia solicitud.
  res.status(201).json({
    application: { id: vendor.id, company_name: vendor.company_name, status: vendor.status },
  })
}
