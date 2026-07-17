import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import VendorModuleService from "../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../modules/vendor"

/**
 * POST /store/vendors/pickup-origin
 * Body: { product_ids: string[] }
 *
 * Devuelve la direccion de recogida (origen del envio) de las tiendas duenas
 * de los productos indicados, resolviendo producto -> metadata.vendor_id ->
 * vendor. Se usa en el checkout para cotizar y crear envios en Skydropx con
 * el origen real de cada tienda.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { product_ids } = req.body as { product_ids?: string[] }

  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    res.status(400).json({ message: "product_ids requerido" })
    return
  }

  const productService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  const products = await productService.listProducts(
    { id: product_ids.slice(0, 100) },
    { select: ["id", "metadata"] }
  )

  const vendorIds = [
    ...new Set(
      products
        .map((p) => (p.metadata as Record<string, unknown>)?.vendor_id as string)
        .filter(Boolean)
    ),
  ]

  if (vendorIds.length === 0) {
    res.json({ origins: [] })
    return
  }

  const vendors = await vendorService.listVendors({ id: vendorIds })

  const origins = vendors
    .filter((v) => v.status === "approved" || v.status === "pending")
    .map((v) => ({
      vendor_id: v.id,
      company_name: v.company_name,
      pickup_address: v.pickup_address ?? null,
      pickup_city: v.pickup_city ?? null,
      contact_phone: v.contact_phone ?? null,
      contact_email: v.contact_email,
    }))

  res.json({ origins })
}
