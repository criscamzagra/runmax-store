import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const status = (req.query.status as string) || undefined

  const productService: IProductModuleService = req.scope.resolve(
    Modules.PRODUCT
  )

  const filters: Record<string, unknown> = {}
  if (status) {
    filters.status = status
  }

  const products = await productService.listProducts(filters, {
    relations: ["variants", "images"],
    order: { created_at: "DESC" },
  })

  const vendorModule = req.scope.resolve("vendor") as any

  const enriched = await Promise.all(
    products.map(async (p) => {
      const vendorId = (p.metadata as Record<string, unknown>)?.vendor_id as string | undefined
      let vendor_name = "—"
      if (vendorId) {
        try {
          const vendor = await vendorModule.retrieveVendor(vendorId)
          vendor_name = vendor.company_name
        } catch {
          vendor_name = "Vendedor eliminado"
        }
      }
      return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        status: p.status,
        thumbnail: p.thumbnail,
        description: p.description,
        vendor_id: vendorId ?? null,
        vendor_name,
        variants_count: p.variants?.length ?? 0,
        images: (p.images ?? []).map((img: any) => ({ url: img.url })),
        created_at: p.created_at,
        updated_at: p.updated_at,
      }
    })
  )

  res.json({ products: enriched, count: enriched.length })
}
