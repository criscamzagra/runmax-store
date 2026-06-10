import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id } = req.params
  const { status } = req.body as { status: "published" | "rejected" | "draft" }

  if (!["published", "rejected", "draft"].includes(status)) {
    res.status(400).json({ message: "Status invalido. Usar: published, rejected, draft" })
    return
  }

  const productService: IProductModuleService = req.scope.resolve(
    Modules.PRODUCT
  )

  try {
    const product = await productService.updateProducts(id, { status })
    res.json({ product })
  } catch {
    res.status(404).json({ message: "Producto no encontrado" })
  }
}
