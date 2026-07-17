import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IOrderModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /store/orders/:id/skydropx-shipment
 * Body: { shipment_id, tracking_number, label_url, carrier }
 *
 * Registra en la metadata del pedido la guia de Skydropx creada por el webhook
 * de confirmacion de pago. Es append-only e idempotente: si el pedido ya tiene
 * skydropx_shipment_id, no se sobreescribe y se responde { already: true }.
 * Asi los reintentos del webhook de ePayco no generan (ni contabilizan) guias
 * duplicadas, y el numero de guia queda visible para vendedor, admin y cliente.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id } = req.params
  const { shipment_id, tracking_number, label_url, carrier } = (req.body ??
    {}) as {
    shipment_id?: string
    tracking_number?: string
    label_url?: string
    carrier?: string
  }

  if (!shipment_id) {
    res.status(400).json({ message: "shipment_id requerido" })
    return
  }

  const orderService: IOrderModuleService = req.scope.resolve(Modules.ORDER)

  let order
  try {
    order = await orderService.retrieveOrder(id)
  } catch {
    res.status(404).json({ message: "Pedido no encontrado" })
    return
  }

  const metadata = (order.metadata ?? {}) as Record<string, unknown>

  // Idempotencia: si ya hay guia registrada, no se sobreescribe.
  if (metadata.skydropx_shipment_id) {
    res.json({
      already: true,
      skydropx_shipment_id: metadata.skydropx_shipment_id,
    })
    return
  }

  await orderService.updateOrders(id, {
    metadata: {
      ...metadata,
      skydropx_shipment_id: shipment_id,
      skydropx_tracking_number: tracking_number ?? null,
      skydropx_label_url: label_url ?? null,
      skydropx_carrier: carrier ?? null,
    },
  })

  res.json({ ok: true })
}
