import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isValidGuideLinkToken } from "../../../../../utils/guide-link"

/**
 * GET /store/orders/:id/guide-access?t=<token>
 *
 * ¿El enlace «Ver e imprimir la guía» del correo de nueva venta es válido para
 * este pedido? Responde `{ valid }` y nada más: la llave de la firma no sale
 * del backend. Lo consulta la página /guia del frontend antes de mostrar la
 * guía (con datos del cliente) y de pasar el pedido a «Preparando».
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const valid = isValidGuideLinkToken(req.params.id, req.query.t)
  res.status(valid ? 200 : 403).json({ valid })
}
