import { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { readCategoryIds } from "./vendor-product-classification"

type Scope = { resolve: <T>(key: string) => T }

/**
 * Las categorías que eligió el vendedor, solo las que existen en Medusa.
 * `undefined` si el cuerpo no trae `category_ids`: no se cambian.
 */
export async function resolveVendorCategoryIds(scope: Scope, body: unknown): Promise<string[] | undefined> {
  const ids = readCategoryIds(body)
  if (!ids || ids.length === 0) return ids
  const productService = scope.resolve<IProductModuleService>(Modules.PRODUCT)
  const found = await productService.listProductCategories({ id: ids }, { select: ["id"] })
  const existing = new Set(found.map((category) => category.id))
  return ids.filter((id) => existing.has(id))
}
