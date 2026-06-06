import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorId = req.auth_context.app_metadata?.vendor_id as string

  if (!vendorId) {
    res.status(401).json({ message: "No autenticado como vendedor" })
    return
  }

  const productService: IProductModuleService = req.scope.resolve(
    Modules.PRODUCT
  )

  const allProducts = await productService.listProducts(
    {},
    {
      select: [
        "id",
        "title",
        "handle",
        "status",
        "thumbnail",
        "description",
        "created_at",
        "updated_at",
        "metadata",
      ],
      relations: ["variants", "variants.prices"],
      order: { created_at: "DESC" },
    }
  )

  const products = allProducts.filter(
    (p) => (p.metadata as Record<string, unknown>)?.vendor_id === vendorId
  )

  res.json({ products, count: products.length })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorId = req.auth_context.app_metadata?.vendor_id as string

  if (!vendorId) {
    res.status(401).json({ message: "No autenticado como vendedor" })
    return
  }

  const { title, description, thumbnail, variants } = req.body as {
    title: string
    description?: string
    thumbnail?: string
    variants: Array<{
      title: string
      sku?: string
      prices: Array<{ amount: number; currency_code: string }>
      manage_inventory?: boolean
    }>
  }

  if (!title || !variants?.length) {
    res.status(400).json({
      message: "Campos requeridos: title, variants (al menos una)",
    })
    return
  }

  const productService: IProductModuleService = req.scope.resolve(
    Modules.PRODUCT
  )

  const handle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const product = await productService.createProducts({
    title,
    handle: `${handle}-${vendorId.slice(-6)}`,
    description: description ?? null,
    thumbnail: thumbnail ?? null,
    status: "draft",
    metadata: { vendor_id: vendorId },
    variants: variants.map((v) => ({
      title: v.title,
      sku: v.sku,
      manage_inventory: v.manage_inventory ?? false,
      prices: v.prices,
    })),
  })

  res.status(201).json({ product })
}
