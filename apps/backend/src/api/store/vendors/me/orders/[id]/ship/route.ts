import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { IOrderModuleService, IProductModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createOrderShipmentWorkflow } from "@medusajs/core-flows"
import VendorModuleService from "../../../../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../../../../modules/vendor"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorId = req.auth_context.app_metadata?.vendor_id as string
  const orderId = req.params.id
  const { tracking_number } = (req.body || {}) as { tracking_number?: string }

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
    res.status(400).json({ message: "No hay fulfillment para este pedido. Primero marca como preparado." })
    return
  }

  try {
    await createOrderShipmentWorkflow(req.scope).run({
      input: {
        order_id: orderId,
        fulfillment_id: fulfillment.id,
        items: vendorItems.map((item) => ({
          id: item.id,
          quantity: item.quantity as number,
        })),
        labels: tracking_number
          ? [{ tracking_number, tracking_url: "", label_url: "" }]
          : undefined,
      },
    })

    res.json({ success: true })
  } catch (error) {
    console.error("[vendor-ship] error:", error)
    const message = error instanceof Error ? error.message : "Error al crear envio"
    res.status(400).json({ message })
  }
}
