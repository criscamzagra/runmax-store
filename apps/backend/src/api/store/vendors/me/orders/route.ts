import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { IOrderModuleService, IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import VendorModuleService from "../../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../../modules/vendor"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorId = req.auth_context.app_metadata?.vendor_id as string

  if (!vendorId) {
    res.status(401).json({ message: "No autenticado como vendedor" })
    return
  }

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  const vendor = await vendorService.retrieveVendor(vendorId)

  if (vendor.status !== "approved") {
    res.status(403).json({ message: "Vendedor no aprobado" })
    return
  }

  const productService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
  const orderService: IOrderModuleService = req.scope.resolve(Modules.ORDER)

  const allProducts = await productService.listProducts(
    {},
    { select: ["id", "title", "thumbnail", "metadata"] }
  )
  const vendorProductIds = allProducts
    .filter((p) => (p.metadata as Record<string, unknown>)?.vendor_id === vendorId)
    .map((p) => p.id)

  if (vendorProductIds.length === 0) {
    res.json({ orders: [], count: 0 })
    return
  }

  const vendorProductMap = Object.fromEntries(
    allProducts
      .filter((p) => vendorProductIds.includes(p.id))
      .map((p) => [p.id, { title: p.title, thumbnail: p.thumbnail }])
  )

  const allOrders = await orderService.listOrders(
    {},
    {
      select: ["id", "created_at", "display_id", "currency_code", "fulfillment_status", "payment_status"],
      relations: ["items", "shipping_address"],
      order: { created_at: "DESC" },
      take: 100,
    }
  )

  const vendorOrders = allOrders
    .filter((order) =>
      order.items?.some((item: any) =>
        vendorProductIds.includes(item.product_id)
      )
    )
    .map((order) => {
      const vendorItems = (order.items || []).filter((item: any) =>
        vendorProductIds.includes(item.product_id)
      )
      const vendorTotal = vendorItems.reduce(
        (sum: number, item: any) =>
          sum + ((item.unit_price as number) || 0) * ((item.quantity as number) || 1),
        0
      )
      const firstItem = vendorItems[0] as any
      const productInfo = firstItem
        ? vendorProductMap[firstItem.product_id as string]
        : null

      return {
        id: order.id,
        display_id: order.display_id,
        created_at: order.created_at,
        customer_name: order.shipping_address
          ? `${(order.shipping_address as any).first_name || ""} ${(order.shipping_address as any).last_name || ""}`.trim()
          : "Cliente",
        city: (order.shipping_address as any)?.city || "—",
        product_title: productInfo?.title || (firstItem?.title as string) || "—",
        product_thumbnail: productInfo?.thumbnail || null,
        quantity: vendorItems.reduce(
          (s: number, i: any) => s + ((i.quantity as number) || 1),
          0
        ),
        vendor_total: vendorTotal,
        fulfillment_status: (() => {
          const details = vendorItems.map((i: any) => (i.detail || {}) as any)
          const allDelivered = details.length > 0 && details.every((d: any) => (d.delivered_quantity as number) >= (d.quantity as number))
          if (allDelivered) return "delivered"
          const anyShipped = details.some((d: any) => (d.shipped_quantity as number) > 0)
          if (anyShipped) return "shipped"
          const allFulfilled = details.length > 0 && details.every((d: any) => (d.fulfilled_quantity as number) >= (d.quantity as number))
          if (allFulfilled) return "fulfilled"
          return "not_fulfilled"
        })(),
        payment_status: order.status === "completed" ? "captured" : "not_paid",
        currency_code: order.currency_code || "cop",
        is_mock: !order.id.startsWith("order_01"),
      }
    })

  res.json({ orders: vendorOrders, count: vendorOrders.length })
}
