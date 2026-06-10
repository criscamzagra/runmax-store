import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { IOrderModuleService, IProductModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { markOrderFulfillmentAsDeliveredWorkflow } from "@medusajs/core-flows"
import VendorModuleService from "../../../../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../../../../modules/vendor"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorId = req.auth_context.app_metadata?.vendor_id as string
  const orderId = req.params.id

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

  const order = await orderService.retrieveOrder(orderId, {
    relations: ["items"],
  })

  const allProducts = await productService.listProducts(
    {},
    { select: ["id", "metadata"] }
  )
  const vendorProductIds = new Set(
    allProducts
      .filter((p) => (p.metadata as Record<string, string> | null)?.vendor_id === vendorId)
      .map((p) => p.id)
  )

  const vendorItems = (order.items || []).filter((item) =>
    item.product_id && vendorProductIds.has(item.product_id)
  )

  if (vendorItems.length === 0) {
    res.status(403).json({ message: "Este pedido no contiene productos tuyos" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orderData } = await query.graph({
    entity: "order",
    fields: ["fulfillments.*"],
    filters: { id: orderId },
  })

  const fulfillments = (orderData[0] as Record<string, unknown>)?.fulfillments as Array<{ id: string }> | undefined
  const fulfillment = fulfillments?.[0]

  if (!fulfillment) {
    res.status(400).json({ message: "No hay fulfillment para este pedido" })
    return
  }

  try {
    await markOrderFulfillmentAsDeliveredWorkflow(req.scope).run({
      input: {
        orderId,
        fulfillmentId: fulfillment.id,
      },
    })

    res.json({ success: true })
  } catch (error) {
    console.error("[vendor-deliver] error:", error)
    const message = error instanceof Error ? error.message : "Error al marcar como entregado"
    res.status(400).json({ message })
  }
}
