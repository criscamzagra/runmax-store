import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { IProductModuleService, ISalesChannelModuleService, IInventoryService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/core-flows"
import { VENDOR_MODULE } from "../../../../../modules/vendor"
import VendorModuleService from "../../../../../modules/vendor/service"

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
      relations: ["variants"],
      order: { created_at: "DESC" },
    }
  )

  const products = allProducts.filter(
    (p) => (p.metadata as Record<string, unknown>)?.vendor_id === vendorId
  )

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const variantIds = products.flatMap((p) => p.variants.map((v) => v.id))

  let inventoryMap: Record<string, number> = {}
  if (variantIds.length > 0) {
    try {
      const { data: links } = await query.graph({
        entity: "product_variant_inventory_item",
        fields: ["variant_id", "inventory_item_id", "inventory.location_levels.*"],
        filters: { variant_id: variantIds },
      })
      for (const link of links as Array<Record<string, unknown>>) {
        const vid = link.variant_id as string
        const inv = link.inventory as Record<string, unknown> | undefined
        const levels = (inv?.location_levels ?? []) as Array<Record<string, number>>
        const total = levels.reduce((s, l) => s + (l.stocked_quantity ?? 0), 0)
        inventoryMap[vid] = (inventoryMap[vid] ?? 0) + total
      }
    } catch {
      // inventory module may not have links yet
    }
  }

  const enriched = products.map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({
      ...v,
      inventory_quantity: inventoryMap[v.id] ?? null,
    })),
  }))

  res.json({ products: enriched, count: enriched.length })
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

  const { title, description, thumbnail, images, variants } = req.body as {
    title: string
    description?: string
    thumbnail?: string
    images?: Array<{ url: string }>
    variants: Array<{
      title: string
      sku?: string
      prices: Array<{ amount: number; currency_code: string }>
      inventory_quantity?: number
    }>
  }

  if (!title || !variants?.length) {
    res.status(400).json({
      message: "Campos requeridos: title, variants (al menos una)",
    })
    return
  }

  const handle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const suffix = vendorId.slice(-6).toLowerCase()

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  const vendor = await vendorService.retrieveVendor(vendorId)

  const salesChannelService: ISalesChannelModuleService = req.scope.resolve(
    Modules.SALES_CHANNEL
  )
  const [defaultChannel] = await salesChannelService.listSalesChannels({}, { take: 1 })

  const fulfillmentService = req.scope.resolve(Modules.FULFILLMENT)
  const [defaultProfile] = await fulfillmentService.listShippingProfiles({}, { take: 1 })

  const { result } = await createProductsWorkflow(req.scope).run({
    input: {
      products: [
        {
          title,
          handle: `${handle}-${suffix}`,
          description: description ?? undefined,
          thumbnail: thumbnail ?? undefined,
          images: images ?? [],
          status: "draft" as const,
          metadata: { vendor_id: vendorId, vendor_company_name: vendor.company_name },
          shipping_profile_id: defaultProfile?.id ?? undefined,
          sales_channels: defaultChannel
            ? [{ id: defaultChannel.id }]
            : [],
          variants: variants.map((v) => ({
            title: v.title,
            sku: v.sku,
            manage_inventory: true,
            prices: v.prices,
          })),
        },
      ],
    },
  })

  const createdProduct = result[0]

  const hasInventory = variants.some((v) => v.inventory_quantity != null && v.inventory_quantity > 0)
  if (hasInventory) {
    try {
      const inventoryService: IInventoryService = req.scope.resolve(Modules.INVENTORY)
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const STOCK_LOCATION = "sloc_CO_BOGOTA"

      for (let i = 0; i < createdProduct.variants.length; i++) {
        const qty = variants[i]?.inventory_quantity
        if (qty == null || qty <= 0) continue

        const variantId = createdProduct.variants[i].id
        const { data: links } = await query.graph({
          entity: "product_variant_inventory_item",
          fields: ["inventory_item_id"],
          filters: { variant_id: variantId },
        })

        const inventoryItemId = (links[0] as Record<string, string>)?.inventory_item_id
        if (!inventoryItemId) continue

        try {
          await inventoryService.createInventoryLevels([{
            inventory_item_id: inventoryItemId,
            location_id: STOCK_LOCATION,
            stocked_quantity: qty,
          }])
        } catch {
          await inventoryService.updateInventoryLevels([{
            inventory_item_id: inventoryItemId,
            location_id: STOCK_LOCATION,
            stocked_quantity: qty,
          }])
        }
      }
    } catch (err) {
      console.error("[vendor-product] inventory setup error:", err)
    }
  }

  res.status(201).json({ product: createdProduct })
}
