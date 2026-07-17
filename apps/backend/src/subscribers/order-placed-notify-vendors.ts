import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { IOrderModuleService, IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import VendorModuleService from "../modules/vendor/service"
import { VENDOR_MODULE } from "../modules/vendor"
import {
  sendVendorNewSaleEmail,
  SoldItem,
} from "../utils/vendor-new-sale-email"

/**
 * Cuando se crea un pedido (pago ya aprobado en el checkout), notifica por
 * correo a cada vendedor cuyos productos fueron comprados, con el detalle
 * de sus items y el enlace al panel de gestion de pedidos.
 */
export default async function orderPlacedNotifyVendors({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderService: IOrderModuleService = container.resolve(Modules.ORDER)
  const productService: IProductModuleService = container.resolve(Modules.PRODUCT)
  const vendorService: VendorModuleService = container.resolve(VENDOR_MODULE)

  try {
    const order = await orderService.retrieveOrder(data.id, {
      relations: ["items", "shipping_address"],
    })

    const items = (order.items || []) as any[]
    if (items.length === 0) return

    // Mapear product_id -> vendor_id via metadata del producto
    const productIds = [
      ...new Set(items.map((i) => i.product_id).filter(Boolean)),
    ] as string[]
    if (productIds.length === 0) return

    const products = await productService.listProducts(
      { id: productIds },
      { select: ["id", "metadata"] }
    )
    const productVendorMap = Object.fromEntries(
      products.map((p) => [
        p.id,
        ((p.metadata as Record<string, unknown>)?.vendor_id as string) || null,
      ])
    )

    // Agrupar items por vendedor
    const itemsByVendor = new Map<string, SoldItem[]>()
    for (const item of items) {
      const vendorId = item.product_id
        ? productVendorMap[item.product_id]
        : null
      if (!vendorId) continue
      const list = itemsByVendor.get(vendorId) ?? []
      list.push({
        title: (item.title as string) || "Producto",
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
      })
      itemsByVendor.set(vendorId, list)
    }

    if (itemsByVendor.size === 0) return

    const shippingAddress = order.shipping_address as any
    const customerName = shippingAddress
      ? `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim() || "Cliente"
      : "Cliente"
    const customerCity = shippingAddress?.city || "—"

    for (const [vendorId, soldItems] of itemsByVendor) {
      try {
        const vendor = await vendorService.retrieveVendor(vendorId)
        if (!vendor?.contact_email) continue

        const total = soldItems.reduce(
          (sum, i) => sum + i.unit_price * i.quantity,
          0
        )

        await sendVendorNewSaleEmail({
          to: vendor.contact_email,
          companyName: vendor.company_name,
          displayId: order.display_id ?? order.id,
          items: soldItems,
          total,
          customerName,
          customerCity,
        })
      } catch (e) {
        console.error(
          `[order-placed] No se pudo notificar al vendedor ${vendorId}:`,
          e
        )
      }
    }
  } catch (e) {
    console.error("[order-placed] Error notificando vendedores:", e)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
