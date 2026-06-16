import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { IProductModuleService, IInventoryService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../../../../../../../modules/vendor"
import VendorModuleService from "../../../../../../../modules/vendor/service"

const STOCK_LOCATION = "sloc_01KTBY4F203FEY9R5VH5WR4F3R"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorId = req.auth_context.app_metadata?.vendor_id as string
  const productId = req.params.id

  if (!vendorId) {
    res.status(401).json({ message: "No autenticado como vendedor" })
    return
  }

  const productService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
  const product = await productService.retrieveProduct(productId, { relations: ["variants"] })
  const meta = product.metadata as Record<string, string> | null

  if (meta?.vendor_id !== vendorId) {
    res.status(403).json({ message: "Este producto no te pertenece" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const variantIds = product.variants.map((v) => v.id)

  const inventory: Array<{ variant_id: string; variant_title: string; sku: string | null; stocked_quantity: number }> = []

  if (variantIds.length > 0) {
    const { data: links } = await query.graph({
      entity: "product_variant_inventory_item",
      fields: ["variant_id", "inventory_item_id", "inventory.location_levels.*"],
      filters: { variant_id: variantIds },
    })

    const levelMap: Record<string, number> = {}
    for (const link of links as any[]) {
      const vid = link.variant_id as string
      const inv = link.inventory as any
      const levels = (inv?.location_levels ?? []) as Array<Record<string, number>>
      const total = levels.reduce((s, l) => s + (l.stocked_quantity ?? 0), 0)
      levelMap[vid] = (levelMap[vid] ?? 0) + total
    }

    for (const v of product.variants) {
      inventory.push({
        variant_id: v.id,
        variant_title: v.title,
        sku: v.sku,
        stocked_quantity: levelMap[v.id] ?? 0,
      })
    }
  }

  res.json({ product_id: productId, product_title: product.title, inventory })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorId = req.auth_context.app_metadata?.vendor_id as string
  const productId = req.params.id

  if (!vendorId) {
    res.status(401).json({ message: "No autenticado como vendedor" })
    return
  }

  const { updates } = req.body as {
    updates: Array<{ variant_id: string; stocked_quantity: number }>
  }

  if (!updates || updates.length === 0) {
    res.status(400).json({ message: "Se requiere al menos una actualización de stock" })
    return
  }

  const productService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
  const product = await productService.retrieveProduct(productId, { relations: ["variants"] })
  const meta = product.metadata as Record<string, string> | null

  if (meta?.vendor_id !== vendorId) {
    res.status(403).json({ message: "Este producto no te pertenece" })
    return
  }

  const validVariantIds = new Set(product.variants.map((v) => v.id))
  for (const u of updates) {
    if (!validVariantIds.has(u.variant_id)) {
      res.status(400).json({ message: `Variante ${u.variant_id} no pertenece a este producto` })
      return
    }
  }

  const inventoryService: IInventoryService = req.scope.resolve(Modules.INVENTORY)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const results: Array<{ variant_id: string; stocked_quantity: number; success: boolean }> = []

  for (const u of updates) {
    try {
      const { data: links } = await query.graph({
        entity: "product_variant_inventory_item",
        fields: ["inventory_item_id"],
        filters: { variant_id: u.variant_id },
      })

      let inventoryItemId = (links[0] as any)?.inventory_item_id as string | undefined

      if (!inventoryItemId) {
        const variant = product.variants.find((v) => v.id === u.variant_id)
        const [created] = await inventoryService.createInventoryItems([{
          sku: variant?.sku ?? u.variant_id,
          requires_shipping: true,
        }])
        inventoryItemId = created.id

        const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
        await remoteLink.create({
          [Modules.PRODUCT]: { variant_id: u.variant_id },
          [Modules.INVENTORY]: { inventory_item_id: inventoryItemId },
        })
      }

      try {
        await inventoryService.updateInventoryLevels([{
          inventory_item_id: inventoryItemId,
          location_id: STOCK_LOCATION,
          stocked_quantity: u.stocked_quantity,
        }])
      } catch {
        await inventoryService.createInventoryLevels([{
          inventory_item_id: inventoryItemId,
          location_id: STOCK_LOCATION,
          stocked_quantity: u.stocked_quantity,
        }])
      }

      results.push({ variant_id: u.variant_id, stocked_quantity: u.stocked_quantity, success: true })
    } catch (err) {
      console.error(`[vendor-inventory] error updating ${u.variant_id}:`, err)
      results.push({ variant_id: u.variant_id, stocked_quantity: 0, success: false })
    }
  }

  res.json({ results })
}
