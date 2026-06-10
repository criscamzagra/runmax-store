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
    { select: ["id", "title", "metadata"] }
  )
  const vendorProductIds = allProducts
    .filter((p) => (p.metadata as Record<string, unknown>)?.vendor_id === vendorId)
    .map((p) => p.id)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const allOrders = await orderService.listOrders(
    {},
    {
      select: ["id", "created_at", "currency_code", "fulfillment_status", "payment_status", "display_id"],
      relations: ["items", "shipping_address"],
      order: { created_at: "DESC" },
      take: 500,
    }
  )

  const vendorOrders = allOrders.filter((order) =>
    order.items?.some((item: Record<string, unknown>) =>
      vendorProductIds.includes(item.product_id as string)
    )
  )

  const recentOrders = vendorOrders.filter(
    (o) => new Date(o.created_at) >= thirtyDaysAgo
  )

  let gmv = 0
  const productUnits: Record<string, { name: string; units: number; revenue: number }> = {}
  const dailySales: Record<string, number> = {}

  for (const order of recentOrders) {
    const vendorItems = (order.items || []).filter((item: Record<string, unknown>) =>
      vendorProductIds.includes(item.product_id as string)
    )

    for (const item of vendorItems) {
      const typedItem = item as Record<string, unknown>
      const unitPrice = (typedItem.unit_price as number) || 0
      const qty = (typedItem.quantity as number) || 1
      const lineTotal = unitPrice * qty

      gmv += lineTotal

      const productId = typedItem.product_id as string
      const productTitle = (typedItem.product_title as string) ||
        allProducts.find((p) => p.id === productId)?.title ||
        "Producto"

      if (!productUnits[productId]) {
        productUnits[productId] = { name: productTitle, units: 0, revenue: 0 }
      }
      productUnits[productId].units += qty
      productUnits[productId].revenue += lineTotal
    }

    const day = new Date(order.created_at).toISOString().slice(0, 10)
    const dayTotal = vendorItems.reduce(
      (s: number, i: Record<string, unknown>) =>
        s + ((i.unit_price as number) || 0) * ((i.quantity as number) || 1),
      0
    )
    dailySales[day] = (dailySales[day] || 0) + dayTotal
  }

  const fee = gmv * (vendor.fee_pct / 100)
  const neto = gmv - fee

  let pendientes = 0
  let enRuta = 0
  for (const order of vendorOrders) {
    const items = (order.items || []) as Array<Record<string, unknown>>
    const vendorItems = items.filter((i) => vendorProductIds.includes(i.product_id as string))
    const detail = vendorItems.map((i) => (i.detail || {}) as Record<string, unknown>)
    const allFulfilled = detail.length > 0 && detail.every((d) => (d.fulfilled_quantity as number) >= (d.quantity as number))
    const anyShipped = detail.some((d) => (d.shipped_quantity as number) > 0)
    const allDelivered = detail.length > 0 && detail.every((d) => (d.delivered_quantity as number) >= (d.quantity as number))
    if (allDelivered) continue
    if (anyShipped && !allDelivered) { enRuta++; continue }
    if (!allFulfilled) { pendientes++; continue }
  }

  const dailySalesArray: Array<{ date: string; gmv: number }> = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    dailySalesArray.push({ date: iso, gmv: dailySales[iso] || 0 })
  }

  const topProducts = Object.values(productUnits)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  const liquidation = recentOrders
    .slice(0, 10)
    .map((order) => {
      const vendorItems = (order.items || []).filter((item: Record<string, unknown>) =>
        vendorProductIds.includes(item.product_id as string)
      )
      const bruto = vendorItems.reduce(
        (s: number, i: Record<string, unknown>) =>
          s + ((i.unit_price as number) || 0) * ((i.quantity as number) || 1),
        0
      )
      const orderFee = bruto * (vendor.fee_pct / 100)
      return {
        order_id: order.id,
        display_id: order.display_id,
        created_at: order.created_at,
        bruto,
        fee: orderFee,
        neto: bruto - orderFee,
      }
    })

  res.json({
    kpis: {
      gmv,
      ingreso_neto: neto,
      fee_marketplace: fee,
      fee_pct: vendor.fee_pct,
      pedidos_pendientes: pendientes,
      en_ruta: enRuta,
      total_orders: vendorOrders.length,
      total_products: vendorProductIds.length,
    },
    daily_sales: dailySalesArray,
    top_products: topProducts,
    liquidation,
  })
}
