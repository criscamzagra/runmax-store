import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { IProductModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow, deleteProductsWorkflow } from "@medusajs/core-flows"

async function getVendorProduct(
  req: AuthenticatedMedusaRequest,
  productId: string
) {
  const vendorId = req.auth_context.app_metadata?.vendor_id as string
  if (!vendorId) return { error: "No autenticado como vendedor", status: 401 }

  const productService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)

  let product
  try {
    product = await productService.retrieveProduct(productId, {
      relations: ["variants", "images"],
    })
  } catch {
    return { error: "Producto no encontrado", status: 404 }
  }

  if ((product.metadata as Record<string, unknown>)?.vendor_id !== vendorId) {
    return { error: "Este producto no te pertenece", status: 403 }
  }

  return { product, vendorId }
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productId = req.params.id
  const result = await getVendorProduct(req, productId)

  if ("error" in result) {
    res.status(result.status!).json({ message: result.error })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [fullProduct] } = await query.graph({
    entity: "product",
    fields: [
      "id", "title", "handle", "description", "status", "thumbnail",
      "metadata", "created_at", "updated_at",
      "images.*",
      "variants.*",
      "variants.prices.*",
    ],
    filters: { id: productId },
  })

  res.json({ product: fullProduct ?? result.product })
}

export async function PUT(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productId = req.params.id
  const result = await getVendorProduct(req, productId)

  if ("error" in result) {
    res.status(result.status!).json({ message: result.error })
    return
  }

  const { product: existingProduct } = result
  const { title, description, thumbnail, images, variants } = req.body as {
    title?: string
    description?: string
    thumbnail?: string
    images?: Array<{ url: string }>
    variants?: Array<{
      id?: string
      title: string
      sku?: string
      prices: Array<{ amount: number; currency_code: string }>
    }>
  }

  const updateData: Record<string, unknown> = { id: productId }

  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (thumbnail !== undefined) updateData.thumbnail = thumbnail
  if (images !== undefined) updateData.images = images

  const wasRejected = existingProduct.status === "rejected"
  if (wasRejected) {
    updateData.status = "draft"
    const existingMeta = (existingProduct.metadata ?? {}) as Record<string, unknown>
    const { rejection_reason: _, ...cleanMeta } = existingMeta
    updateData.metadata = cleanMeta
  }

  if (variants?.length) {
    updateData.variants = variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      title: v.title,
      sku: v.sku,
      prices: v.prices,
    }))
  }

  const { result: updated } = await updateProductsWorkflow(req.scope).run({
    input: {
      products: [updateData],
    },
  })

  res.json({ product: updated[0] })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productId = req.params.id
  const result = await getVendorProduct(req, productId)

  if ("error" in result) {
    res.status(result.status!).json({ message: result.error })
    return
  }

  await deleteProductsWorkflow(req.scope).run({
    input: { ids: [productId] },
  })

  res.json({ id: productId, deleted: true })
}
